<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class ActivityHistoryController extends Controller
{
    use AuthorizesRequests;
    public const PER_PAGE = 15;

    /**
     * Staff: list users whose activity the current user can view (landing page for "Activity History").
     */
    public function indexForStaff(Request $request)
    {
        $me = $request->user();
        if (! $me->hasRole('admin') && ! $me->hasRole('manager') && ! $me->hasRole('matchmaker')) {
            abort(403);
        }

        $query = User::role('user')
            ->whereIn('status', ['prospect', 'member', 'client', 'client_expire'])
            ->select('id', 'name', 'username', 'status');

        if ($me->hasRole('matchmaker')) {
            $query->where('assigned_matchmaker_id', $me->id);
        } elseif ($me->hasRole('manager')) {
            $matchmakerIds = User::role('matchmaker')->where('agency_id', $me->agency_id)->pluck('id');
            $query->where(function ($q) use ($me, $matchmakerIds) {
                $q->where('agency_id', $me->agency_id)
                    ->orWhereIn('assigned_matchmaker_id', $matchmakerIds)
                    ->orWhere('validated_by_manager_id', $me->id);
            });
        }
        // Admin: no extra filter

        $users = $query->with('profile')->orderBy('name')->limit(500)->get();
        
        $usersPayload = $users->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'username' => $u->username,
            'status' => $u->status,
            'profile' => [
                'profile_picture' => $u->profile?->profile_picture_path,
            ],
        ]);

        $selectedUser = null;
        $activitiesPayload = null;

        $filters = [
            'type' => '',
            'date_from' => '',
            'date_to' => '',
            'search' => '',
        ];

        $selectedUserId = $request->input('user_id');
        if ($selectedUserId) {
            $selectedUser = $users->firstWhere('id', (int) $selectedUserId);
        }

        if (! $selectedUser && $users->isNotEmpty()) {
            $selectedUser = $users->first();
        }

        if ($selectedUser) {
            [$userPayload, $activitiesPayload, $filters] = $this->buildActivityPayload($request, $selectedUser);
        }
        return Inertia::render('activity-history-index', [
            'users' => $usersPayload,
            'selectedUser' => $selectedUser ? $userPayload : null,
            'activities' => $activitiesPayload,
            'filters' => $filters,
        ]);
    }

    /**
     * Show activity history for the authenticated client (own activities).
     */
    public function own(Request $request): Response
    {
        $user = $request->user();
        $this->authorize('viewUserActivities', $user);

        return $this->index($request, $user);
    }

    /**
     * Show activity history for a prospect (staff view).
     */
    public function forUser(Request $request, User $user): RedirectResponse
    {
        $this->authorize('viewUserActivities', $user);

        $queryParams = array_filter([
            'user_id' => $user->id,
            'type' => $request->input('type'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'search' => $request->input('search'),
            'page' => $request->input('page'),
        ], static fn ($value) => $value !== null && $value !== '');

        return redirect()->route('staff.activity', $queryParams);
    }

    private function index(Request $request, User $targetUser): Response
    {
        [$userPayload, $activitiesData, $filters] = $this->buildActivityPayload($request, $targetUser);

        return Inertia::render('activity-history', [
            'user' => $userPayload,
            'activities' => $activitiesData,
            'filters' => $filters,
        ]);
    }

    private function buildActivityPayload(Request $request, User $targetUser): array
    {
        $query = UserActivity::query()
            ->where('user_id', $targetUser->id)
            ->with(['performer' => fn ($q) => $q->select('id', 'name')])
            ->orderBy('created_at', 'desc');

        $type = $request->string('type')->trim();
        if ($type->isNotEmpty() && in_array($type->toString(), UserActivity::types(), true)) {
            $query->where('type', $type->toString());
        }

        $dateFrom = $request->string('date_from')->trim();
        if ($dateFrom->isNotEmpty()) {
            $query->whereDate('created_at', '>=', $dateFrom->toString());
        }

        $dateTo = $request->string('date_to')->trim();
        if ($dateTo->isNotEmpty()) {
            $query->whereDate('created_at', '<=', $dateTo->toString());
        }

        $search = $request->string('search')->trim();
        if ($search->isNotEmpty()) {
            $query->where('description', 'like', '%' . $search->toString() . '%');
        }

        $activities = $query->paginate(self::PER_PAGE)->withQueryString();

        $membershipTier = null;
        $targetUser->load(['activeSubscription.matrimonialPack', 'profile.matrimonialPack']);
        $activeSub = $targetUser->activeSubscription;
        if ($activeSub && $activeSub->matrimonialPack) {
            $membershipTier = $activeSub->matrimonialPack->name;
        }
        // For members (validated): use pack stored at validation (profile) when no active subscription
        if ($membershipTier === null && $targetUser->profile && $targetUser->profile->matrimonialPack) {
            $membershipTier = $targetUser->profile->matrimonialPack->name;
        }

        $userPayload = [
            'id' => $targetUser->id,
            'name' => $targetUser->name,
            'username' => $targetUser->username,
            'profile_picture' => $targetUser->profile?->profile_picture_path,
            'status' => $targetUser->status,
            'membership_tier' => $membershipTier,
        ];

        $activitiesData = $activities->toArray();
        $performerIds = array_unique(array_filter(array_column($activitiesData['data'], 'performed_by')));
        $rolesByUser = [];
        if (! empty($performerIds)) {
            $roles = \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->whereIn('model_has_roles.model_id', $performerIds)
                ->select('model_has_roles.model_id', 'roles.name as role_name')
                ->get();
            foreach ($roles as $r) {
                $rolesByUser[$r->model_id] = $r->role_name;
            }
        }

        $activitiesData['data'] = array_map(function ($item) use ($rolesByUser) {
            $performer = $item['performer'] ?? null;
            $performedByPayload = null;
            if ($performer) {
                $performedByPayload = [
                    'id' => $performer['id'],
                    'name' => $performer['name'],
                    'role' => $rolesByUser[$performer['id']] ?? null,
                ];
            } elseif (! empty($item['metadata']['performer_label'] ?? null)) {
                $performedByPayload = ['label' => $item['metadata']['performer_label']];
            } else {
                $performedByPayload = ['label' => 'System'];
            }
            return [
                'id' => $item['id'],
                'type' => $item['type'],
                'description' => $item['description'],
                'metadata' => $item['metadata'] ?? [],
                'created_at' => $item['created_at'],
                'performed_by' => $performedByPayload,
            ];
        }, $activitiesData['data']);

        return [
            $userPayload,
            $activitiesData,
            [
                'type' => $type->toString(),
                'date_from' => $dateFrom->toString(),
                'date_to' => $dateTo->toString(),
                'search' => $search->toString(),
            ],
        ];
    }
}
