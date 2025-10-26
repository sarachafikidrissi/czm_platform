<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class UserController extends Controller
{
    public function matchmakers()
    {
        /** @var User $user */
        $user = Auth::user();

        $matchmakers = User::role('matchmaker')
            ->where('approval_status', 'approved')
            ->with('agency')
            ->get();

        return Inertia::render('user/matchmakers', [
            'matchmakers' => $matchmakers,
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
        $user = User::with(['profile', 'agency', 'roles', 'posts' => function($query) {
                $query->with(['user', 'likes', 'comments.user'])
                      ->orderBy('created_at', 'desc');
            }])
            ->where('username', $username)
            ->firstOrFail();
        
        // Get user role
        $userRole = $user->roles->first()?->name ?? 'user';
        
        // Add like status for current user and append accessor attributes
        if (Auth::check()) {
            $user->posts->each(function ($post) {
                $post->is_liked = $post->isLikedBy(Auth::id());
                $post->likes_count = $post->likes_count;
                $post->comments_count = $post->comments_count;
            });
        }
        
        return Inertia::render('user/profile', [
            'user' => $user,
            'profile' => $user->profile,
            'agency' => $user->agency,
        ]);
    }
}