<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\Post;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard based on user role
     */
    public function index(): Response
    {
        $user = Auth::user();
        $role = $this->getUserRole($user);
        
        $agencies = [];
        $stats = null;
        $posts = null;
        $profile = null;
        $subscriptionReminder = null;
        $accountStatus = null;
        $rejectedBy = null;
        $unpaidBill = null;
        $expiredSubscription = null;
        $recentPosts = null;

        // Admin dashboard data
        if ($role === 'admin') {
            $agencies = Agency::all();
            $stats = $this->getAdminStats();
        }
        
        // Manager dashboard data
        if ($role === 'manager' && $user && $user->agency_id) {
            $stats = $this->getManagerStats($user);
            $posts = $this->getManagerPosts($user);
        }
        
        // User dashboard data
        if ($role === 'user' && $user) {
            $profile = $user->profile;
            $accountStatus = $profile ? $profile->account_status : 'active';
            $user->load('assignedMatchmaker');
            
            // Refresh subscriptions relationship to ensure we have the latest data
            $user->load('subscriptions');
            
            $rejectedBy = $this->getRejectedBy($user);
            $unpaidBill = $this->getUnpaidBill($user);
            
            // Get expired subscription - will return null if user has any active subscription
            $expiredSubscription = $this->getExpiredSubscription($user);
            
            $subscriptionReminder = $this->getSubscriptionReminder($user);
            $recentPosts = $this->getRecentPosts();
        }

        return Inertia::render('dashboard', [
            'role' => $role,
            'agencies' => $agencies,
            'stats' => $stats,
            'profile' => $profile,
            'subscriptionReminder' => $subscriptionReminder,
            'accountStatus' => $accountStatus,
            'rejectedBy' => $rejectedBy ? [
                'id' => $rejectedBy->id,
                'name' => $rejectedBy->name,
                'phone' => $rejectedBy->phone,
            ] : null,
            'unpaidBill' => $unpaidBill ? [
                'id' => $unpaidBill->id,
                'bill_number' => $unpaidBill->bill_number,
                'total_amount' => $unpaidBill->total_amount,
                'currency' => $unpaidBill->currency,
                'due_date' => $unpaidBill->due_date->format('d/m/Y'),
            ] : null,
            'expiredSubscription' => $expiredSubscription,
            'posts' => $posts,
            'recentPosts' => $recentPosts ?? null,
        ]);
    }

    /**
     * Get user role from database
     */
    private function getUserRole(?User $user): ?string
    {
        if (!$user) {
            return null;
        }

        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $user->id)
            ->value('roles.name');
    }

    /**
     * Get admin statistics
     */
    private function getAdminStats(): array
    {
        return [
            'totalUsers' => User::count(),
            'pending' => User::where('approval_status', 'pending')->count(),
            'approvedManagers' => User::role('manager')->where('approval_status', 'approved')->count(),
            'approvedMatchmakers' => User::role('matchmaker')->where('approval_status', 'approved')->count(),
        ];
    }

    /**
     * Get manager statistics
     */
    private function getManagerStats(User $user): array
    {
        $prospectsCount = User::role('user')
            ->where('status', 'prospect')
            ->where('agency_id', $user->agency_id)
            ->count();
        
        $activeClientsCount = User::role('user')
            ->where('status', 'client')
            ->where(function($query) use ($user) {
                $query->where('agency_id', $user->agency_id)
                      ->orWhere('validated_by_manager_id', $user->id);
            })
            ->count();
        
        $membersCount = User::role('user')
            ->where('status', 'member')
            ->where(function($query) use ($user) {
                $query->where('agency_id', $user->agency_id)
                      ->orWhere('validated_by_manager_id', $user->id);
            })
            ->count();
        
        return [
            'prospectsReceived' => $prospectsCount,
            'activeClients' => $activeClientsCount,
            'members' => $membersCount,
        ];
    }

    /**
     * Get manager posts
     */
    private function getManagerPosts(User $user)
    {
        $posts = Post::with(['user.profile', 'agency', 'likes', 'comments.user.roles', 'comments.user.profile'])
            ->where('agency_id', $user->agency_id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Add like status and parse media URLs
        if (Auth::check()) {
            $posts->getCollection()->each(function ($post) {
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

        return $posts;
    }

    /**
     * Get rejected by user information
     */
    private function getRejectedBy(User $user): ?User
    {
        if (!$user->rejected_by) {
            return null;
        }

        return User::find($user->rejected_by);
    }

    /**
     * Get unpaid bill for user
     */
    private function getUnpaidBill(User $user)
    {
        return $user->bills()
            ->where('status', 'unpaid')
            ->orderBy('due_date', 'asc')
            ->first();
    }

    /**
     * Get expired subscription for user
     */
    private function getExpiredSubscription(User $user): ?array
    {
        // Use a fresh query to check subscriptions (not the relationship cache)
        // First, check if user has any subscription with status 'active'
        // If such a subscription exists, don't show the expired alert
        $activeSubscription = \App\Models\UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->latest('created_at')
            ->first();

        // If there's an active subscription, don't show expired alert
        if ($activeSubscription) {
            return null;
        }

        // Only show expired alert if there's no active subscription
        $expiredSubscriptionRecord = \App\Models\UserSubscription::where('user_id', $user->id)
            ->where('status', 'expired')
            ->with(['matrimonialPack', 'assignedMatchmaker'])
            ->orderBy('subscription_end', 'desc')
            ->first();
        
        if (!$expiredSubscriptionRecord) {
            return null;
        }

        return [
            'expirationDate' => $expiredSubscriptionRecord->subscription_end->format('d/m/Y'),
            'packName' => $expiredSubscriptionRecord->matrimonialPack->name ?? 'Pack',
            'matchmaker' => $expiredSubscriptionRecord->assignedMatchmaker ? [
                'name' => $expiredSubscriptionRecord->assignedMatchmaker->name,
                'phone' => $expiredSubscriptionRecord->assignedMatchmaker->phone,
                'email' => $expiredSubscriptionRecord->assignedMatchmaker->email,
            ] : null,
        ];
    }

    /**
     * Get subscription reminder for user
     */
    private function getSubscriptionReminder(User $user): ?array
    {
        $today = Carbon::today();
        
        // Use a fresh query to check subscriptions (not the relationship cache)
        // First, check if there's any active subscription
        $activeSubscription = \App\Models\UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->latest('created_at')
            ->first();
        
        // If there's no active subscription, don't show reminder
        if (!$activeSubscription) {
            return null;
        }
        
        // Check if the active subscription hasn't expired yet
        $subscription = \App\Models\UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->whereDate('subscription_start', '<=', $today)
            ->whereDate('subscription_end', '>=', $today)
            ->with(['matrimonialPack', 'assignedMatchmaker'])
            ->orderBy('created_at', 'desc')
            ->first();
        
        // If there's an active non-expired subscription, show reminder if needed
        if ($subscription) {
            $expirationDate = Carbon::parse($subscription->subscription_end);
            $daysRemaining = $today->diffInDays($expirationDate, false);
            
            // Show reminder if subscription expires within 30 days
            if ($daysRemaining <= 30 && $daysRemaining >= 0) {
                return [
                    'daysRemaining' => $daysRemaining,
                    'expirationDate' => $expirationDate->format('d/m/Y'),
                    'isExpired' => false,
                    'packName' => $subscription->matrimonialPack->name ?? 'Pack',
                ];
            }
        }

        return null;
    }

    /**
     * Get recent posts from matchmakers and managers
     */
    private function getRecentPosts()
    {
        $matchmakerIds = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->pluck('id');
        
        $managerIds = User::role('manager')
            ->where('approval_status', 'approved')
            ->pluck('id');
        
        $staffIds = $matchmakerIds->merge($managerIds)->unique();
        
        $recentPosts = Post::with([
            'user' => function($query) {
                $query->with('roles', 'profile');
            },
            'agency',
            'likes',
            'comments.user.roles',
            'comments.user.profile'
        ])
        ->whereIn('user_id', $staffIds)
        ->orderBy('created_at', 'desc')
        ->limit(10)
        ->get();

        // Add like status and parse media URLs
        if (Auth::check()) {
            $recentPosts->each(function ($post) {
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

        return $recentPosts;
    }
}

