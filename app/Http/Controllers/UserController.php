<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class UserController extends Controller
{
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
            ) as latest_posts'), function($join) {
                $join->on('posts.user_id', '=', 'latest_posts.user_id')
                     ->on('posts.created_at', '=', 'latest_posts.latest_created_at');
            })
            ->with(['user.profile', 'user.agency', 'likes', 'comments.user.roles', 'comments.user.profile'])
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
        
        if (!$user) {
            return redirect()->back()->with('error', 'User not authenticated.');
        }
        
        // Check if user already has a matchmaker
        if ($user->assigned_matchmaker_id) {
            return redirect()->back()->with('error', 'You already have an assigned matchmaker.');
        }

        $matchmaker = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->findOrFail($id);
        
        $user->update([
            'assigned_matchmaker_id' => $matchmaker->id,
        ]);

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
            'profile', 
            'agency', 
            'roles', 
            'assignedMatchmaker:id,agency_id,name,email', // Include more fields for better debugging
            'posts' => function($query) {
                $query->with(['user.profile','user', 'likes', 'comments.user.roles', 'comments.user.profile'])
                      ->orderBy('created_at', 'desc');
            }, 
            'photos'
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

        // Format photos for frontend - ensure photos are loaded
        $photos = collect([]);
        if ($user->relationLoaded('photos') && $user->photos && $user->photos->isNotEmpty()) {
            $photos = $user->photos->map(function ($photo) {
                $filePath = $photo->file_path;
                
                // Generate URL - for public disk, use /storage/ prefix
                $url = null;
                if ($filePath) {
                    // Remove any leading slashes or storage/ prefix if present
                    $cleanPath = ltrim($filePath, '/');
                    $cleanPath = preg_replace('#^storage/#', '', $cleanPath);
                    
                    // Build the correct storage URL
                    $url = '/storage/' . $cleanPath;
                }
                
                return [
                    'id' => $photo->id,
                    'file_path' => $filePath,
                    'file_name' => $photo->file_name ?? 'photo',
                    'url' => $url,
                    'created_at' => $photo->created_at,
                ];
            })->filter(function ($photo) {
                // Filter out photos with no file path or URL
                return !empty($photo['file_path']) && !empty($photo['url']);
            })->values();
        }

        return Inertia::render('user/profile', [
            'user' => $user,
            'profile' => $user->profile,
            'agency' => $user->agency,
            'matchmakerNotes' => $notes,
            'matchmakerEvaluation' => $evaluation,
            'photos' => $photos,
        ]);
    }

    public function subscription()
    {
        /** @var User $user */
        $user = Auth::user();
        
        // Check account status
        $profile = $user->profile;
        if ($profile && $profile->account_status === 'desactivated') {
            return redirect()->route('dashboard');
        }
        
        // Load assigned matchmaker relationship
        $user->load('assignedMatchmaker');
        
        // Get user's latest subscription
        $latestSubscription = $user->subscriptions()
            ->with(['matrimonialPack', 'assignedMatchmaker'])
            ->orderBy('created_at', 'desc')
            ->first();
        
        // Get user's profile with matrimonial pack info
        $profile = $user->profile;
        
        return Inertia::render('user/subscription', [
            'user' => $user,
            'profile' => $profile,
            'subscription' => $latestSubscription,
            'subscriptionStatus' => $user->getSubscriptionStatus(),
        ]);
    }
}