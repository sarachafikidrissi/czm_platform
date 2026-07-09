<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\User;
use App\Models\UserAssignment;
use App\Services\MatchmakingResultsPayloadService;
use App\Services\MatchmakingService;
use App\Services\ObjectiveCommissionCalculator;
use App\Services\ObjectiveMetricsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class UserController extends Controller
{
    private function evaluationAccessLevel(?User $viewer, User $target): string
    {
        if (! $viewer) {
            return 'none';
        }

        $canWrite = ($viewer->hasRole('matchmaker') && $target->assigned_matchmaker_id === $viewer->id)
            || ($viewer->hasRole('manager') && $target->validated_by_manager_id === $viewer->id);

        if ($canWrite) {
            return 'write';
        }

        if ($viewer->hasRole('admin')) {
            return 'read';
        }

        if ($viewer->hasRole('manager')) {
            if ($target->validated_by_manager_id === $viewer->id) {
                return 'read';
            }

            if ($target->assigned_matchmaker_id) {
                $assignedMatchmakerAgencyId = $target->assignedMatchmaker?->agency_id
                    ?? User::where('id', $target->assigned_matchmaker_id)->value('agency_id');
                if ($assignedMatchmakerAgencyId && $assignedMatchmakerAgencyId === $viewer->agency_id) {
                    return 'read';
                }
            }
        }

        if ($viewer->hasRole('matchmaker')) {
            $hasAcceptedRequest = PropositionRequest::query()
                ->where('from_matchmaker_id', $viewer->id)
                ->where('compatible_user_id', $target->id)
                ->where('status', 'accepted')
                ->exists();

            if ($hasAcceptedRequest) {
                return 'read';
            }
        }

        return 'none';
    }

    public function matchmakers()
    {
        /** @var User $user */
        $user = Auth::user();

        // Check account status
        $profile = $user->profile;
        if ($profile && $profile->account_status === 'desactivated') {
            return redirect()->route('dashboard');
        }

        // Get the latest post per matchmaker
        $latestPosts = Post::select('posts.*')
            ->join(DB::raw('(
                SELECT user_id, MAX(created_at) as latest_created_at
                FROM posts
                WHERE user_id IN (
                    SELECT u.id 
                    FROM users u
                    JOIN model_has_roles mhr ON u.id = mhr.model_id
                    JOIN roles r ON mhr.role_id = r.id
                    WHERE r.name = "matchmaker" AND u.approval_status = "approved"
                )
                GROUP BY user_id
            ) as latest_posts'), function ($join) {
                $join->on('posts.user_id', '=', 'latest_posts.user_id')
                    ->on('posts.created_at', '=', 'latest_posts.latest_created_at');
            })
            ->with(['user.profile', 'user.agency', 'likes.user.profile', 'comments.user.roles', 'comments.user.profile'])
            ->orderBy('posts.created_at', 'desc')
            ->paginate(10);

        // Add like status for current user and append accessor attributes
        if (Auth::check()) {
            $latestPosts->getCollection()->each(function ($post) {
                $post->is_liked = $post->isLikedBy(Auth::id());
                $post->likes_count = $post->likes_count;
                $post->comments_count = $post->comments_count;

                // Parse media_url if it's JSON (multiple images)
                if ($post->type === 'image' && $post->media_url) {
                    $decoded = json_decode($post->media_url, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $post->media_urls = $decoded;
                    } else {
                        $post->media_urls = [$post->media_url];
                    }
                }
            });
        }

        return Inertia::render('user/matchmakers', [
            'posts' => $latestPosts,
            'assignedMatchmaker' => $user?->assignedMatchmaker,
        ]);
    }

    public function selectMatchmaker(Request $request, $id)
    {
        /** @var User $user */
        $user = Auth::user();

        if (! $user) {
            return redirect()->back()->with('error', 'User not authenticated.');
        }

        // Check if user already has a matchmaker
        if ($user->assigned_matchmaker_id) {
            return redirect()->back()->with('error', 'You already have an assigned matchmaker.');
        }

        $matchmaker = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->findOrFail($id);

        DB::transaction(function () use ($user, $matchmaker) {
            $user->update([
                'assigned_matchmaker_id' => $matchmaker->id,
            ]);

            UserAssignment::recordAssignment($user->id, $matchmaker->id, null, 'self_selected');
        });

        return redirect()->back()->with('success', 'Matchmaker selected successfully.');
    }

    public function profile($username)
    {
        $currentUser = Auth::user();

        // If current user is a regular user (not admin/manager/matchmaker), check their account status
        if ($currentUser && $currentUser->hasRole('user')) {
            $currentProfile = $currentUser->profile;
            if ($currentProfile && $currentProfile->account_status === 'desactivated') {
                return redirect()->route('dashboard');
            }
        }

        $user = User::with([
            'profile.matrimonialPack',
            'agency',
            'roles',
            'assignedMatchmaker:id,agency_id,name,email',
            'assignedMatchmaker.agency:id,name',
            'posts' => function ($query) {
                $query->with(['user.profile', 'user', 'likes.user.profile', 'comments.user.roles', 'comments.user.profile'])
                    ->orderBy('created_at', 'desc');
            },
            'photos',
        ])
            ->where('username', $username)
            ->firstOrFail();

        // Check if the profile being viewed belongs to a desactivated account (if viewer is a regular user)
        if ($currentUser && $currentUser->hasRole('user')) {
            $viewedProfile = $user->profile;
            if ($viewedProfile && $viewedProfile->account_status === 'desactivated') {
                return redirect()->route('dashboard')->with('error', 'Ce profil n\'est pas accessible.');
            }
        }

        // Get user role
        $userRole = $user->roles->first()?->name ?? 'user';

        $propositionToRespond = null;
        if ($currentUser && $currentUser->hasRole('user') && $userRole === 'user' && $currentUser->id !== $user->id) {
            $proposition = Proposition::query()
                ->where('recipient_user_id', $currentUser->id)
                ->where(function ($query) use ($currentUser, $user) {
                    $query->where(function ($sub) use ($currentUser, $user) {
                        $sub->where('reference_user_id', $currentUser->id)
                            ->where('compatible_user_id', $user->id);
                    })->orWhere(function ($sub) use ($currentUser, $user) {
                        $sub->where('reference_user_id', $user->id)
                            ->where('compatible_user_id', $currentUser->id);
                    });
                })
                ->with([
                    'matchmaker:id,name,username',
                    'referenceUser:id,name,username',
                    'referenceUser.profile:id,user_id,profile_picture_path',
                    'compatibleUser:id,name,username',
                    'compatibleUser.profile:id,user_id,profile_picture_path',
                ])
                ->latest()
                ->first();

            if ($proposition) {
                $isExpired = $proposition->status === 'expired'
                    || ($proposition->status === 'pending'
                        && $proposition->created_at
                        && $proposition->created_at->lt(now()->subDays(7)));

                $propositionToRespond = [
                    'id' => $proposition->id,
                    'message' => $proposition->message,
                    'status' => $proposition->status,
                    'user_response' => $proposition->user_response,
                    'is_expired' => $isExpired,
                    'response_message' => $proposition->response_message,
                    'responded_at' => $proposition->responded_at,
                    'created_at' => $proposition->created_at,
                    'matchmaker' => $proposition->matchmaker ? [
                        'id' => $proposition->matchmaker->id,
                        'name' => $proposition->matchmaker->name,
                        'username' => $proposition->matchmaker->username,
                    ] : null,
                    'reference_user' => $proposition->referenceUser ? [
                        'id' => $proposition->referenceUser->id,
                        'name' => $proposition->referenceUser->name,
                        'username' => $proposition->referenceUser->username,
                        'profile' => $proposition->referenceUser->profile,
                    ] : null,
                    'compatible_user' => $proposition->compatibleUser ? [
                        'id' => $proposition->compatibleUser->id,
                        'name' => $proposition->compatibleUser->name,
                        'username' => $proposition->compatibleUser->username,
                        'profile' => $proposition->compatibleUser->profile,
                    ] : null,
                ];
            }
        }

        // Add like status for current user and append accessor attributes
        if (Auth::check()) {
            $user->posts->each(function ($post) {
                $post->is_liked = $post->isLikedBy(Auth::id());
                $post->likes_count = $post->likes_count;
                $post->comments_count = $post->comments_count;

                // Parse media_url if it's JSON (multiple images)
                if ($post->type === 'image' && $post->media_url) {
                    $decoded = json_decode($post->media_url, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $post->media_urls = $decoded;
                    } else {
                        $post->media_urls = [$post->media_url];
                    }
                }
            });
        }

        // Load notes and evaluation
        $notes = \App\Models\MatchmakerNote::where('user_id', $user->id)
            ->with('author:id,name,username')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($note) {
                return [
                    'id' => $note->id,
                    'author_id' => $note->author_id,
                    'content' => $note->content,
                    'contact_type' => $note->contact_type,
                    'created_during_validation' => $note->created_during_validation,
                    'created_at' => $note->created_at,
                    'author' => $note->author,
                ];
            });

        $evaluation = \App\Models\MatchmakerEvaluation::where('user_id', $user->id)->first();
        $evaluationAccessLevel = $this->evaluationAccessLevel($currentUser, $user);

        // Format photos for frontend - ensure photos are loaded
        $currentUser = Auth::user();
        $photos = collect([]);
        if ($user->relationLoaded('photos') && $user->photos && $user->photos->isNotEmpty()) {
            $photos = $user->photos->map(function ($photo) use ($currentUser, $user) {
                $filePath = $photo->file_path;

                // Generate URL - for public disk, use /storage/ prefix
                $url = null;
                if ($filePath) {
                    // Remove any leading slashes or storage/ prefix if present
                    $cleanPath = ltrim($filePath, '/');
                    $cleanPath = preg_replace('#^storage/#', '', $cleanPath);

                    // Build the correct storage URL
                    $url = '/storage/'.$cleanPath;
                }

                // Check if current user can delete this specific photo
                $canDeleteThisPhoto = false;
                if ($currentUser && $currentUser->hasRole('user') && $user->id === $currentUser->id) {
                    // User can only delete photos they uploaded themselves
                    $canDeleteThisPhoto = ($photo->uploaded_by === $currentUser->id || $photo->uploaded_by === null);
                } elseif ($currentUser && $currentUser->hasRole('matchmaker') && $user->assigned_matchmaker_id === $currentUser->id) {
                    // Matchmaker can delete photos of assigned users
                    $canDeleteThisPhoto = true;
                } elseif ($currentUser && $currentUser->hasRole('admin')) {
                    // Admin can delete any photo
                    $canDeleteThisPhoto = true;
                }

                return [
                    'id' => $photo->id,
                    'file_path' => $filePath,
                    'file_name' => $photo->file_name ?? 'photo',
                    'url' => $url,
                    'created_at' => $photo->created_at,
                    'uploaded_by' => $photo->uploaded_by,
                    'can_delete' => $canDeleteThisPhoto,
                ];
            })->filter(function ($photo) {
                // Filter out photos with no file path or URL
                return ! empty($photo['file_path']) && ! empty($photo['url']);
            })->values();
        }

        // Load additional data for matchmakers viewing profiles
        $bills = collect([]);
        $subscriptions = collect([]);
        $matchmakingSearch = null;
        $matchmakingResults = null;
        $hasBill = false;

        if ($currentUser && ($currentUser->hasRole('matchmaker') || $currentUser->hasRole('admin') || $currentUser->hasRole('manager'))) {
            if ($userRole === 'user') {
            // Load bills
            $bills = $user->bills()
                ->with([
                    'matchmaker:id,name,email',
                    'user:id,name,email,gender,country',
                    'user.profile:id,user_id,pays_residence',
                    'profile:id,user_id,pays_residence',
                ])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($bill) {
                    $memberCountry = $bill->profile?->pays_residence
                        ?? $bill->user?->profile?->pays_residence
                        ?? $bill->user?->country;

                    return [
                        'id' => $bill->id,
                        'bill_number' => $bill->bill_number,
                        'order_number' => $bill->order_number,
                        'bill_date' => $bill->bill_date,
                        'due_date' => $bill->due_date,
                        'status' => $bill->status,
                        'amount' => $bill->amount,
                        'tax_rate' => $bill->tax_rate,
                        'tax_amount' => $bill->tax_amount,
                        'total_amount' => $bill->total_amount,
                        'currency' => $bill->currency,
                        'payment_method' => $bill->payment_method,
                        'pack_name' => $bill->pack_name,
                        'pack_price' => $bill->pack_price,
                        'pack_advantages' => $bill->pack_advantages,
                        'notes' => $bill->notes,
                        'matchmaker' => $bill->matchmaker,
                        'member_country' => $memberCountry,
                        'member_gender' => $bill->user?->gender,
                    ];
                });

            // Add has_bill flag
            $hasBill = $user->bills()->where('status', '!=', 'paid')->exists();

            // Load subscriptions
            $subscriptions = $user->subscriptions()
                ->with(['matrimonialPack', 'assignedMatchmaker:id,name,email'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($subscription) {
                    return [
                        'id' => $subscription->id,
                        'matrimonial_pack_id' => $subscription->matrimonial_pack_id,
                        'subscription_start' => $subscription->subscription_start,
                        'subscription_end' => $subscription->subscription_end,
                        'duration_months' => $subscription->duration_months,
                        'pack_price' => $subscription->pack_price,
                        'pack_advantages' => $subscription->pack_advantages,
                        'payment_mode' => $subscription->payment_mode,
                        'status' => $subscription->status,
                        'notes' => $subscription->notes,
                        'matrimonial_pack' => $subscription->matrimonialPack,
                        'assigned_matchmaker' => $subscription->assignedMatchmaker,
                        'is_active' => $subscription->is_active,
                        'is_expired' => $subscription->is_expired,
                        'days_remaining' => $subscription->days_remaining,
                    ];
                });
            }

            // Load matchmaking search criteria from profile
            if ($user->profile) {
                $matchmakingSearch = [
                    'age_minimum' => $user->profile->age_minimum,
                    'age_maximum' => $user->profile->age_maximum,
                    'situation_matrimoniale_recherche' => $user->profile->situation_matrimoniale_recherche,
                    'pays_recherche' => $user->profile->pays_recherche,
                    'villes_recherche' => $user->profile->villes_recherche,
                    'niveau_etudes_recherche' => $user->profile->niveau_etudes_recherche,
                    'statut_emploi_recherche' => $user->profile->statut_emploi_recherche,
                    'revenu_minimum' => $user->profile->revenu_minimum,
                    'religion_recherche' => $user->profile->religion_recherche,
                    'profil_recherche_description' => $user->profile->profil_recherche_description,
                ];
            }

            // Load matchmaking results (À proposer functionality)
            if ($user->profile && $user->profile->is_completed) {
                try {
                    $matchmakingService = new MatchmakingService;
                    $result = $matchmakingService->findMatches($user->id);

                    if ($currentUser->hasRole('matchmaker')) {
                        $matchmakingResults = MatchmakingResultsPayloadService::formatMatchesForMatchmaker(
                            $result['matches'],
                            $currentUser,
                            (int) $user->id
                        );
                    } else {
                        $matchmakingResults = array_map(static function ($match) {
                            return [
                                'user' => [
                                    'id' => $match['user']->id,
                                    'name' => $match['user']->name,
                                    'email' => $match['user']->email,
                                    'username' => $match['user']->username,
                                    'gender' => $match['user']->gender,
                                ],
                                'profile' => $match['profile']->toArray(),
                                'score' => $match['score'],
                                'scoreDetails' => $match['scoreDetails'],
                                'completeness' => $match['completeness'],
                                'proposition' => Proposition::activeSnapshotForUser((int) $match['user']->id),
                            ];
                        }, $result['matches']);
                    }
                } catch (\Exception $e) {
                    // If matchmaking fails, just set to empty array
                    $matchmakingResults = [];
                }
            }
        }

        // Load performance data for staff subjects (authorized viewers only)
        $staffPerformance = null;
        $viewerRole = $currentUser?->roles->first()?->name ?? 'user';
        $isOwnProfile = $currentUser && $currentUser->id === $user->id;
        $viewerIsManagerOfSubjectAgency = $viewerRole === 'manager'
            && $currentUser?->agency_id
            && $user->agency_id
            && (int) $currentUser->agency_id === (int) $user->agency_id;
        $viewerCanSeePerformance = $viewerRole === 'admin'
            || $isOwnProfile
            || $viewerIsManagerOfSubjectAgency;

        if ($viewerCanSeePerformance && in_array($userRole, ['matchmaker', 'manager'], true)) {
            $currentMonth = now()->month;
            $currentYear = now()->year;

            $realized = $userRole === 'manager'
                ? ObjectiveMetricsService::calculateRealizedForManager(
                    $user->id, $currentMonth, $currentYear
                )
                : ObjectiveMetricsService::calculateRealizedForMatchmaker(
                    $user->id, $currentMonth, $currentYear
                );

            $objective = ObjectiveMetricsService::resolveObjectiveForUser(
                $user->id, $currentMonth, $currentYear
            );

            $progress = $objective
                ? ObjectiveCommissionCalculator::calculateProgress($objective, $realized)
                : null;

            $prospectsCount = User::role('user')
                ->where('assigned_matchmaker_id', $user->id)
                ->where('status', 'prospect')
                ->count();

            $staffPerformance = [
                'month' => $currentMonth,
                'year' => $currentYear,
                'prospects' => $prospectsCount,
                'ventes' => $realized['ventes'],
                'membres' => $realized['membres'],
                'rdv' => $realized['rdv'],
                'target_ventes' => $objective?->target_ventes ?? null,
                'target_membres' => $objective?->target_membres ?? null,
                'progress_ventes' => $progress['ventes'] ?? null,
                'progress_membres' => $progress['membres'] ?? null,
            ];
        }

        // Load agency manager for self-view AND assigned staff viewing this profile
        $agencyManager = null;
        $userSubscription = null;

        $isAssignedStaff = $currentUser && (
            ($currentUser->hasRole('matchmaker') &&
             $user->assigned_matchmaker_id === $currentUser->id) ||
            ($currentUser->hasRole('manager') &&
             ($user->validated_by_manager_id === $currentUser->id ||
              $user->assigned_matchmaker_id === $currentUser->id)) ||
            $currentUser->hasRole('admin')
        );

        $isSelfView = $currentUser &&
            $currentUser->id === $user->id &&
            $currentUser->hasRole('user');

        if ($isSelfView) {
            // Load their active subscription with pack
            $userSubscription = $user->subscriptions()
                ->with('matrimonialPack')
                ->where('status', 'active')
                ->latest()
                ->first();
        }

        if ($isSelfView || $isAssignedStaff) {
            // User's agency or their assigned matchmaker's agency
            $resolvedAgencyId = $user->agency_id ?? $user->assignedMatchmaker?->agency_id;
            if ($resolvedAgencyId) {
                $agencyManager = User::whereHas('roles',
                    fn ($q) => $q->where('name', 'manager'))
                    ->where('agency_id', $resolvedAgencyId)
                    ->where('approval_status', 'approved')
                    ->select('id', 'name')
                    ->first();
            }
        }

        $displayAgency = $user->agency ?? $user->assignedMatchmaker?->agency;

        // Add has_bill to user object if it's a matchmaker/admin/manager viewing
        $memberProposition = null;
        $latestMemberProposition = null;
        $memberRdv = null;
        $memberFailedRdv = null;
        if ($currentUser && ($currentUser->hasRole('matchmaker') || $currentUser->hasRole('admin') || $currentUser->hasRole('manager')) && $userRole === 'user') {
            $user->has_bill = $hasBill;
            $memberProposition = Proposition::activeSnapshotForUser((int) $user->id);
            $latestMemberProposition = Proposition::latestSnapshotForUser((int) $user->id);
            $memberRdv = Rdv::activeOrSuccessfulSnapshotForUser((int) $user->id);
            $memberFailedRdv = Rdv::latestFailedSnapshotForUser((int) $user->id);
        }

        return Inertia::render('user/profile', [
            'user' => $user,
            'profile' => $user->profile,
            'agency' => $displayAgency,
            'matchmakerNotes' => $notes,
            'matchmakerEvaluation' => $evaluation,
            'evaluationAccessLevel' => $evaluationAccessLevel,
            'photos' => $photos,
            'bills' => $bills,
            'subscriptions' => $subscriptions,
            'matchmakingSearch' => $matchmakingSearch,
            'matchmakingResults' => $matchmakingResults ?? null,
            'propositionToRespond' => $propositionToRespond,
            'memberProposition' => $memberProposition,
            'latestMemberProposition' => $latestMemberProposition,
            'memberRdv' => $memberRdv,
            'memberFailedRdv' => $memberFailedRdv,
            'userSubscription' => $userSubscription,
            'agencyManager' => $agencyManager,
            'staffPerformance' => $staffPerformance,
        ]);
    }

    public function subscription()
    {
        /** @var User $user */
        $user = Auth::user();

        $profile = $user->profile;
        if ($profile && $profile->account_status === 'desactivated') {
            return redirect()->route('dashboard');
        }

        $user->load('assignedMatchmaker');

        $subscriptions = $user->subscriptions()
            ->with(['matrimonialPack', 'assignedMatchmaker:id,name,email,phone,username,agency_id', 'assignedMatchmaker.agency:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        $paidBills = $user->bills()
            ->where('status', 'paid')
            ->orderBy('created_at')
            ->get(['id', 'created_at']);

        $subscriptions = $subscriptions->map(function ($subscription) use ($paidBills) {
                $linkedBill = $paidBills
                    ->filter(fn ($bill) => $bill->created_at <= $subscription->created_at)
                    ->sortByDesc('created_at')
                    ->first();

                return [
                    'id' => $subscription->id,
                    'matrimonial_pack_id' => $subscription->matrimonial_pack_id,
                    'subscription_start' => $subscription->subscription_start,
                    'subscription_end' => $subscription->subscription_end,
                    'duration_months' => $subscription->duration_months,
                    'pack_price' => $subscription->pack_price,
                    'pack_advantages' => $subscription->pack_advantages,
                    'payment_mode' => $subscription->payment_mode,
                    'status' => $subscription->status,
                    'matrimonial_pack' => $subscription->matrimonialPack,
                    'assigned_matchmaker' => $subscription->assignedMatchmaker,
                    'is_active' => $subscription->is_active,
                    'is_expired' => $subscription->is_expired,
                    'days_remaining' => $subscription->days_remaining,
                    'bill_id' => $linkedBill?->id,
                ];
            });

        $latestSubscription = $subscriptions->first();

        return Inertia::render('user/subscription', [
            'user' => $user,
            'profile' => $profile,
            'subscription' => $latestSubscription,
            'subscriptions' => $subscriptions,
            'subscriptionStatus' => $user->getSubscriptionStatus(),
        ]);
    }
}
