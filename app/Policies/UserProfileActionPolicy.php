<?php

namespace App\Policies;

use App\Http\Controllers\PropositionRequestController;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use App\Services\PropositionStaffPayloadService;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/**
 * Single source of truth for "can this staff member do X on this user profile".
 *
 * Each method mirrors the rule the matching endpoint enforced before this class existed,
 * so the profile page (via abilities()) and the endpoint can no longer disagree.
 * Denial messages are French and shown as-is in the UI (disabled button reason).
 */
class UserProfileActionPolicy
{
    /**
     * Role used by the staff endpoints: the first role row in model_has_roles.
     * Kept identical to the endpoints' historical lookup so behaviour does not change.
     */
    public static function primaryRole(?User $viewer): ?string
    {
        if (! $viewer) {
            return null;
        }

        $lookup = fn () => DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $viewer->id)
            ->value('roles.name');

        // Long-running console processes (queue workers) have no per-request lifetime: never cache there.
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return $lookup();
        }

        // Remembered for the current request only (a profile page asks several times): stored on the
        // request, so a role change is seen on the next request and nothing is shared between requests.
        $attributes = request()->attributes;
        $cache = $attributes->get('czm.primary_role', []);
        if (! array_key_exists($viewer->id, $cache)) {
            $cache[$viewer->id] = $lookup();
            $attributes->set('czm.primary_role', $cache);
        }

        return $cache[$viewer->id];
    }

    public static function isAssignedTo(User $subject, User $viewer): bool
    {
        return $subject->assigned_matchmaker_id !== null
            && (int) $subject->assigned_matchmaker_id === (int) $viewer->id;
    }

    /**
     * Staff who follow this profile (same people who see the staff tabs and stats):
     * admin, the assigned matchmaker/manager, or the manager who validated it.
     */
    public static function followsProfile(User $viewer, User $subject): bool
    {
        return $viewer->hasRole('admin')
            || self::isAssignedTo($subject, $viewer)
            || ($viewer->hasRole('manager') && $subject->validated_by_manager_id !== null
                && (int) $subject->validated_by_manager_id === (int) $viewer->id);
    }

    public static function isDeactivated(User $subject): bool
    {
        return ($subject->profile?->account_status ?? null) === 'desactivated';
    }

    public static function isRejectedProspect(User $subject): bool
    {
        return $subject->status === 'prospect' && ! empty($subject->rejection_reason);
    }

    /**
     * OWN gate for staff-only data (bills, subscriptions, matchmaking results).
     * Admin and manager keep their previous access; a matchmaker sees it only for their own users.
     */
    public function viewStaffData(User $viewer, User $subject): Response
    {
        if ($viewer->hasRole('admin') || $viewer->hasRole('manager')) {
            return Response::allow();
        }

        if ($viewer->hasRole('matchmaker') && self::isAssignedTo($subject, $viewer)) {
            return Response::allow();
        }

        return $this->denyOwnership($subject, $viewer);
    }

    /** Mirrors MatchmakerController::acceptRejectedProspect. */
    public function reactivateProspect(User $viewer, User $subject): Response
    {
        if (! in_array(self::primaryRole($viewer), ['matchmaker', 'manager', 'admin'], true)) {
            return Response::deny('Action réservée au personnel.');
        }

        return Response::allow();
    }

    /** Mirrors AccountStatusController::activateMemberClient. */
    public function activateAccount(User $viewer, User $subject): Response
    {
        $role = self::primaryRole($viewer);

        if (! in_array($role, ['matchmaker', 'manager', 'admin'], true)) {
            return Response::deny('Action réservée au personnel.');
        }

        if ($role !== 'admin' && ! in_array($subject->status, ['member', 'client', 'client_expire', 'prospect'], true)) {
            return Response::deny('Seuls les comptes membres, clients ou prospects peuvent être activés.');
        }

        return Response::allow();
    }

    /** Mirrors AccountStatusController::deactivateMemberClient. */
    public function deactivateAccount(User $viewer, User $subject): Response
    {
        $role = self::primaryRole($viewer);

        if ($role === 'admin') {
            return Response::allow();
        }

        if (! in_array($role, ['matchmaker', 'manager'], true)) {
            return Response::deny('Action réservée au personnel.');
        }

        if (! in_array($subject->status, ['member', 'client', 'client_expire', 'prospect'], true)) {
            return Response::deny('Seuls les comptes membres, clients ou prospects peuvent être désactivés.');
        }

        if ($role === 'matchmaker') {
            return self::isAssignedTo($subject, $viewer)
                ? Response::allow()
                : $this->denyOwnership($subject, $viewer);
        }

        $sameAgency = $viewer->agency_id && (int) $subject->agency_id === (int) $viewer->agency_id;
        $validatedByMe = $subject->validated_by_manager_id !== null
            && (int) $subject->validated_by_manager_id === (int) $viewer->id;

        return ($sameAgency || $validatedByMe)
            ? Response::allow()
            : Response::deny('Réservé à l\'agence du profil.');
    }

    /** Mirrors MatchmakerController::createTransferRequest. */
    public function transfer(User $viewer, User $subject): Response
    {
        $role = self::primaryRole($viewer);

        if (! in_array($role, ['matchmaker', 'manager', 'admin'], true)) {
            return Response::deny('Action réservée au personnel.');
        }

        if ($role === 'matchmaker' && ! self::isAssignedTo($subject, $viewer)) {
            return $this->denyOwnership($subject, $viewer);
        }

        return Response::allow();
    }

    /**
     * Mirrors MatchmakerController::validateProspect: the prospect must have a matchmaker; then admin,
     * or the matchmaker/manager it is assigned to. (Completeness is checked as visibility: see abilities().)
     */
    public function validateProspect(User $viewer, User $subject): Response
    {
        if (! $subject->assigned_matchmaker_id) {
            return Response::deny('Ce prospect doit d\'abord être affecté à un matchmaker.');
        }

        if ($viewer->hasRole('admin') || self::isAssignedTo($subject, $viewer)) {
            return Response::allow();
        }

        return $this->denyOwnership($subject, $viewer);
    }

    /** Mirrors MatchmakerController::editProspectProfile. */
    public function editProfile(User $viewer, User $subject): Response
    {
        $role = self::primaryRole($viewer);

        if (! in_array($role, ['matchmaker', 'manager', 'admin'], true)) {
            return Response::deny('Action réservée au personnel.');
        }

        if ($viewer->hasRole('admin')) {
            return Response::allow();
        }

        $incompleteProfile = ! $subject->profile || ! $subject->profile->is_completed;
        $isMemberOrClient = in_array($subject->status, ['member', 'client', 'client_expire'], true);

        if ($role === 'matchmaker') {
            if (self::isAssignedTo($subject, $viewer)) {
                return Response::allow();
            }
            if ($isMemberOrClient && $incompleteProfile
                && $subject->approved_by !== null && (int) $subject->approved_by === (int) $viewer->id) {
                return Response::allow();
            }

            return $this->denyOwnership($subject, $viewer);
        }

        if ($role === 'manager') {
            if ($subject->status === 'prospect' && ! $subject->assigned_matchmaker_id
                && $subject->agency_id === $viewer->agency_id) {
                return Response::allow();
            }
            if (self::isAssignedTo($subject, $viewer)) {
                return Response::allow();
            }
            if ($isMemberOrClient && $incompleteProfile
                && $subject->validated_by_manager_id !== null
                && (int) $subject->validated_by_manager_id === (int) $viewer->id) {
                return Response::allow();
            }

            return $this->denyOwnership($subject, $viewer);
        }

        return Response::allow();
    }

    /** Mirrors ActivityHistoryController::forUser (viewUserActivities gate). */
    public function viewActivity(User $viewer, User $subject): Response
    {
        return Gate::forUser($viewer)->allows('viewUserActivities', $subject)
            ? Response::allow()
            : $this->denyOwnership($subject, $viewer);
    }

    /** Mirrors MatchmakerController::createSubscriptionPage (first bill / renewal). */
    public function createBill(User $viewer, User $subject): Response
    {
        $role = self::primaryRole($viewer);

        if ($role === 'admin') {
            return Response::allow();
        }

        if ($role === 'matchmaker') {
            return self::isAssignedTo($subject, $viewer)
                ? Response::allow()
                : $this->denyOwnership($subject, $viewer);
        }

        if ($role === 'manager') {
            $sameAgency = $subject->agency_id === $viewer->agency_id;

            return ($sameAgency || self::isAssignedTo($subject, $viewer))
                ? Response::allow()
                : $this->denyOwnership($subject, $viewer);
        }

        return Response::deny('Action réservée au personnel.');
    }

    /** Mirrors MatchmakerController::markAsClient (BillPolicy rule). */
    public function markAsClient(User $viewer, User $subject): Response
    {
        if (! in_array(self::primaryRole($viewer), ['matchmaker', 'manager', 'admin'], true)) {
            return Response::deny('Action réservée au personnel.');
        }

        return BillPolicy::canMarkMemberAsClient($viewer, $subject)
            ? Response::allow()
            : $this->denyOwnership($subject, $viewer);
    }

    /** Mirrors MatchmakerController::markAsRappeler. */
    public function callBack(User $viewer, User $subject): Response
    {
        $role = self::primaryRole($viewer);

        if ($role === 'admin') {
            return Response::allow();
        }

        if ($role === 'matchmaker') {
            $unassignedInMyAgency = $subject->assigned_matchmaker_id === null
                && $subject->agency_id === $viewer->agency_id;
            $approvedByMe = $subject->approved_by !== null && (int) $subject->approved_by === (int) $viewer->id;

            return (self::isAssignedTo($subject, $viewer) || $unassignedInMyAgency || $approvedByMe)
                ? Response::allow()
                : $this->denyOwnership($subject, $viewer);
        }

        if ($role === 'manager') {
            $sameAgency = $subject->agency_id === $viewer->agency_id;
            $validatedByMe = $subject->validated_by_manager_id !== null
                && (int) $subject->validated_by_manager_id === (int) $viewer->id;

            return ($sameAgency || $validatedByMe)
                ? Response::allow()
                : $this->denyOwnership($subject, $viewer);
        }

        return Response::deny('Action réservée au personnel.');
    }

    /**
     * REQUEST rule: ask another matchmaker for a proposition between one of my users and this profile.
     * Mirrors PropositionRequestController::store (matchmaker/manager, profile followed by someone else).
     */
    public function requestProposition(User $viewer, User $subject): Response
    {
        if (! $viewer->hasAnyRole(['matchmaker', 'manager'])) {
            return Response::deny('Action réservée aux matchmakers.');
        }

        if (! $subject->assigned_matchmaker_id) {
            return Response::deny('Profil non assigné à un matchmaker.');
        }

        if (self::isAssignedTo($subject, $viewer)) {
            return Response::deny('Ce profil est déjà suivi par vous.');
        }

        if (! in_array($subject->status, ['member', 'client', 'client_expire'], true) || self::isDeactivated($subject)) {
            return Response::deny('Seuls les membres, clients et clients expirés actifs peuvent recevoir une demande.');
        }

        return Response::allow();
    }

    /** Matchmaking candidates for a user: OWN only for matchmakers (admin/manager unchanged). */
    public function viewMatchmakingResults(User $viewer, User $subject): Response
    {
        return $this->viewStaffData($viewer, $subject);
    }

    /**
     * Payload for the staff profile header: relationship, owner, and every profile action
     * with { visible, allowed, reason, effects }, plus the single main action for the state.
     */
    public function abilities(User $viewer, User $subject, array $context = []): array
    {
        $role = self::primaryRole($viewer);
        $deactivated = self::isDeactivated($subject);
        $rejected = self::isRejectedProspect($subject);
        $status = $subject->status;
        $hasUnpaidBill = (bool) ($context['has_unpaid_bill'] ?? false);
        $isMemberOrClient = in_array($status, ['member', 'client'], true);
        $takesOwnership = in_array($role, ['matchmaker', 'manager'], true) && ! self::isAssignedTo($subject, $viewer)
            ? ['assigns_to_me']
            : [];

        $actions = [];
        $set = function (string $key, bool $visible, ?Response $check = null, array $effects = []) use (&$actions) {
            $allowed = $visible && ($check === null || $check->allowed());
            $actions[$key] = [
                'visible' => $visible,
                'allowed' => $allowed,
                'reason' => $visible && ! $allowed ? ($check?->message() ?: 'Action non autorisée.') : null,
                'effects' => $effects,
            ];
        };

        // Cycle de vie
        $set('reactiver', $rejected && ! $deactivated, $this->reactivateProspect($viewer, $subject), $takesOwnership);
        $set('activer', $deactivated, $this->activateAccount($viewer, $subject), $takesOwnership);
        $set('rappeler', $status === 'client_expire' && ! $subject->to_rappeler && ! $deactivated, $this->callBack($viewer, $subject));
        $set('transferer', ! $deactivated, $this->transfer($viewer, $subject));
        $set('desactiver', ! $deactivated, $this->deactivateAccount($viewer, $subject));

        // Matchmaking: opens the existing matchmaking tab.
        $set('proposer', $isMemberOrClient && ! $deactivated, $this->viewMatchmakingResults($viewer, $subject));
        // REQUEST: only shown on someone else's active member/client, to matchmakers and managers.
        $requestCheck = $this->requestProposition($viewer, $subject);
        $requestBlock = $requestCheck->allowed()
            ? PropositionRequestController::subjectBlockReason($viewer, $subject)
            : null;
        $set('demander', $requestCheck->allowed(), $requestBlock
            ? Response::deny(PropositionRequestController::REQUEST_BLOCK_MESSAGES[$requestBlock])
            : $requestCheck);

        // Answer, on this member's behalf, the proposition waiting for its response (same rule as the endpoint).
        $pendingPropositionId = Proposition::pendingResponsePropositionIdForRecipient((int) $subject->id);
        $pendingProposition = $pendingPropositionId ? Proposition::find($pendingPropositionId) : null;
        $set('repondreProposition', $pendingProposition !== null && ! $deactivated, $pendingProposition
            ? ($viewer->can('respondFor', $pendingProposition)
                ? Response::allow()
                : Response::deny('Seuls le matchmaker qui a créé la proposition et le matchmaker de ce profil peuvent y répondre.'))
            : null);

        // Create the RDV from one of my accepted propositions involving this profile (creator only).
        $rdvCreation = $viewer->hasAnyRole(['matchmaker', 'manager']) && ! $deactivated
            ? app(PropositionStaffPayloadService::class)->rdvCreationFor($viewer, $subject)
            : null;
        $set('creerRdv', $rdvCreation !== null);

        // My requests involving this profile (header lines) and "Proposer" once a request is accepted.
        $requestLinks = $viewer->hasAnyRole(['matchmaker', 'manager']) && in_array($status, ['member', 'client', 'client_expire'], true)
            ? PropositionRequestController::requestLinksFor($viewer, $subject)
            : [];
        $proposableLink = collect($requestLinks)->firstWhere('can_propose', true);
        $set('proposerDemande', $proposableLink !== null && ! $deactivated && ! self::isAssignedTo($subject, $viewer));

        // Facturation
        $billable = in_array($status, ['member', 'client_expire'], true) && ! $deactivated;
        $set('creerFacture', $billable && ! $hasUnpaidBill, $this->createBill($viewer, $subject));
        $set('marquerClient', $billable && $hasUnpaidBill, $this->markAsClient($viewer, $subject));

        // Prospect not validated yet: complete the profile first, then validate it.
        $openProspect = $status === 'prospect' && ! $rejected && ! $deactivated && $subject->approved_at === null;
        $profileComplete = (bool) $subject->profile?->is_completed;
        $set('completerProfil', $openProspect && ! $profileComplete, $this->editProfile($viewer, $subject));
        $set('validerProspect', $openProspect && $profileComplete, $this->validateProspect($viewer, $subject));

        // Dossier
        $set('modifier', true, $this->editProfile($viewer, $subject));
        $set('historique', true, $this->viewActivity($viewer, $subject));

        $main = null;
        if ($deactivated) {
            $main = 'activer';
        } elseif ($rejected) {
            $main = 'reactiver';
        } elseif ($actions['validerProspect']['allowed']) {
            $main = 'validerProspect';
        } elseif ($actions['completerProfil']['allowed']) {
            $main = 'completerProfil';
        } elseif ($actions['creerRdv']['allowed']) {
            $main = 'creerRdv';
        } elseif ($actions['repondreProposition']['allowed']) {
            $main = 'repondreProposition';
        } elseif ($actions['proposerDemande']['visible']) {
            $main = 'proposerDemande';
        } elseif ($actions['demander']['visible']) {
            $main = 'demander';
        } elseif (in_array($status, ['member', 'client_expire'], true)) {
            $main = $hasUnpaidBill ? 'marquerClient' : 'creerFacture';
        } elseif ($status === 'client') {
            $main = 'proposer';
        }

        $owner = $subject->assignedMatchmaker;

        return [
            'relationship' => $viewer->hasRole('admin') ? 'admin'
                : (self::isAssignedTo($subject, $viewer) ? 'owner'
                : ($subject->assigned_matchmaker_id ? 'other' : 'unassigned')),
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'agency' => $owner->agency?->name,
            ] : null,
            'actions' => $actions,
            'main' => $main,
            // A pending request from me for this profile (any of my users): header shows "Demande en cours".
            'request_pending' => $actions['demander']['visible']
                && PropositionRequest::hasOpenRequestFor((int) $viewer->id, (int) $subject->id),
            'request_links' => $requestLinks,
            'pending_proposition_id' => $pendingProposition?->id,
            'rdv_creation' => $rdvCreation,
            'status_links' => $this->statusLinks($viewer, $subject),
        ];
    }

    /**
     * Active proposition and RDV of this member for the header pills, each only included when the viewer may
     * open it (proposition: its creator; RDV: its organiser; managers/admin keep their access).
     * A successful RDV is shown as "Match".
     */
    private function statusLinks(User $viewer, User $subject): array
    {
        $links = ['proposition' => null, 'rdv' => null];

        // Proposition status: only for whoever may open it (its creator; managers/admin keep their access).
        $proposition = Proposition::activeSnapshotForUser((int) $subject->id);
        if ($proposition['exists']) {
            $model = Proposition::find($proposition['proposition_id']);
            if ($model && $viewer->can('view', $model)) {
                $links['proposition'] = [
                    'id' => $proposition['proposition_id'],
                    'status' => $proposition['status'],
                    'url' => route('staff.staff.propositions.show', $model->id),
                ];
            }
        }

        // RDV status: same rule, only for whoever may open it (its organiser; agency manager/admin).
        $rdv = Rdv::activeOrSuccessfulSnapshotForUser((int) $subject->id);
        if ($rdv['exists']) {
            $model = Rdv::find($rdv['rdv_id']);
            if ($model && $viewer->can('view', $model)) {
                $links['rdv'] = [
                    'id' => $rdv['rdv_id'],
                    'status' => $rdv['status'],
                    'url' => route('staff.rdv.show', $model->id),
                ];
            }
        }

        return $links;
    }

    private function denyOwnership(User $subject, User $viewer): Response
    {
        if ($subject->assigned_matchmaker_id && ! self::isAssignedTo($subject, $viewer)) {
            $name = $subject->assignedMatchmaker?->name
                ?? User::query()->whereKey($subject->assigned_matchmaker_id)->value('name');

            return Response::deny($name ? 'Suivi par '.$name : 'Suivi par un autre matchmaker');
        }

        if (! $subject->assigned_matchmaker_id) {
            return Response::deny('Prenez d\'abord en charge ce profil');
        }

        return Response::deny('Action non autorisée.');
    }
}
