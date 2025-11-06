<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AgencyController extends Controller
{
    public function index()
    {
        $agencies = Agency::orderBy('name')->get();
        
        // Add counts manually
        foreach ($agencies as $agency) {
            $agency->matchmakers_count = \App\Models\User::where('agency_id', $agency->id)
                ->whereHas('roles', function($query) {
                    $query->where('name', 'matchmaker');
                })
                ->where('approval_status', 'approved')
                ->count();
            
            $agency->managers_count = \App\Models\User::where('agency_id', $agency->id)
                ->whereHas('roles', function($query) {
                    $query->where('name', 'manager');
                })
                ->where('approval_status', 'approved')
                ->count();
        }

        return Inertia::render('agencies/index', [
            'agencies' => $agencies,
            'selectedAgency' => null,
        ]);
    }

    public function show($id)
    {
        $agency = Agency::findOrFail($id);
        
        // Get matchmakers manually
        $matchmakers = \App\Models\User::where('agency_id', $agency->id)
            ->whereHas('roles', function($query) {
                $query->where('name', 'matchmaker');
            })
            ->where('approval_status', 'approved')
            ->with('roles')
            ->orderBy('name')
            ->get();
        
        // Get managers manually
        $managers = \App\Models\User::where('agency_id', $agency->id)
            ->whereHas('roles', function($query) {
                $query->where('name', 'manager');
            })
            ->where('approval_status', 'approved')
            ->with('roles')
            ->orderBy('name')
            ->get();

        // Get latest posts from matchmakers in this agency
        $matchmakerIds = $matchmakers->pluck('id');
        $latestPosts = Post::with([
            'user' => function($query) {
                $query->with('roles');
            },
            'likes',
            'comments.user.roles',
            'comments.user.profile'
        ])
        ->whereIn('user_id', $matchmakerIds)
        ->orderBy('created_at', 'desc')
        ->limit(5)
        ->get();

        // Add like status for current user
        if (auth()->check()) {
            $latestPosts->each(function ($post) {
                $post->is_liked = $post->isLikedBy(auth()->id());
                $post->likes_count = $post->likes_count;
                $post->comments_count = $post->comments_count;
            });
        }

        // Get all agencies for the nav tabs
        $agencies = Agency::orderBy('name')->get();
        
        // Add counts manually
        foreach ($agencies as $ag) {
            $ag->matchmakers_count = \App\Models\User::where('agency_id', $ag->id)
                ->whereHas('roles', function($query) {
                    $query->where('name', 'matchmaker');
                })
                ->where('approval_status', 'approved')
                ->count();
            
            $ag->managers_count = \App\Models\User::where('agency_id', $ag->id)
                ->whereHas('roles', function($query) {
                    $query->where('name', 'manager');
                })
                ->where('approval_status', 'approved')
                ->count();
        }

        return Inertia::render('agencies/index', [
            'agencies' => $agencies,
            'selectedAgency' => [
                'id' => $agency->id,
                'name' => $agency->name,
                'country' => $agency->country,
                'city' => $agency->city,
                'address' => $agency->address,
                'image' => $agency->image,
                'map' => $agency->map,
                'matchmakers' => $matchmakers->map(function($matchmaker) {
                    return [
                        'id' => $matchmaker->id,
                        'name' => $matchmaker->name,
                        'username' => $matchmaker->username,
                        'email' => $matchmaker->email,
                        'profile_picture' => $matchmaker->profile_picture,
                        'matchmaker_bio' => $matchmaker->matchmaker_bio,
                    ];
                }),
                'managers' => $managers->map(function($manager) {
                    return [
                        'id' => $manager->id,
                        'name' => $manager->name,
                        'username' => $manager->username,
                        'email' => $manager->email,
                        'profile_picture' => $manager->profile_picture,
                    ];
                }),
                'latest_posts' => $latestPosts->map(function($post) {
                    return [
                        'id' => $post->id,
                        'user_id' => $post->user_id,
                        'content' => $post->content,
                        'type' => $post->type,
                        'media_url' => $post->media_url,
                        'media_thumbnail' => $post->media_thumbnail,
                        'created_at' => $post->created_at,
                        'is_liked' => $post->is_liked ?? false,
                        'likes_count' => $post->likes_count ?? 0,
                        'comments_count' => $post->comments_count ?? 0,
                        'user' => [
                            'id' => $post->user->id,
                            'name' => $post->user->name,
                            'username' => $post->user->username,
                            'profile_picture' => $post->user->profile_picture,
                            'roles' => $post->user->roles,
                        ],
                        'comments' => $post->comments->map(function($comment) {
                            return [
                                'id' => $comment->id,
                                'content' => $comment->content,
                                'created_at' => $comment->created_at,
                                'user' => [
                                    'id' => $comment->user->id,
                                    'name' => $comment->user->name,
                                    'profile_picture' => $comment->user->profile_picture,
                                    'roles' => $comment->user->roles,
                                    'profile' => $comment->user->profile ? [
                                        'profile_picture_path' => $comment->user->profile->profile_picture_path,
                                    ] : null,
                                ],
                            ];
                        }),
                    ];
                }),
            ],
        ]);
    }
}

