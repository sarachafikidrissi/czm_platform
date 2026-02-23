<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use App\Models\PostComment;
use App\Models\User;
use App\Models\Activity;
use App\Models\Agency;
use App\Mail\CommentReplyNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PostController extends Controller
{
    public function index()
    {
        $posts = Post::with([
            'user.profile', 
            'agency', 
            'likes.user.profile', 
            'comments' => function($query) {
                $query->whereNull('parent_id')
                    ->with(['user.roles', 'user.profile', 'replies.user.roles', 'replies.user.profile']);
            }
        ])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Add like status for current user and append accessor attributes
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

        return Inertia::render('posts/index', [
            'posts' => $posts
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $isManager = $user->hasRole('manager');
        
        // Conditional validation: content is required only for text type
        $rules = [
            'type' => 'required|in:text,image,youtube',
            'media_url' => 'nullable|string|max:500',
            'media_thumbnail' => 'nullable|string|max:500',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max per image
            'agency_id' => 'nullable|exists:agencies,id'
        ];

        // Content is required only for text type, optional for image and youtube
        if ($request->type === 'text') {
            $rules['content'] = 'required|string|max:2000';
        } else {
            $rules['content'] = 'nullable|string|max:2000';
        }

        $request->validate($rules);

        // Additional validation: ensure image/youtube posts have required media
        if ($request->type === 'image') {
            if (!$request->hasFile('images') && !$request->media_url) {
                return redirect()->back()->withErrors(['images' => 'Please upload images or provide an image URL for image posts.']);
            }
        } elseif ($request->type === 'youtube') {
            if (!$request->media_url) {
                return redirect()->back()->withErrors(['media_url' => 'Please provide a YouTube URL for YouTube posts.']);
            }
        }

        $mediaUrl = $request->media_url;
        $mediaThumbnail = $request->media_thumbnail;

        // Handle image uploads
        if ($request->hasFile('images') && $request->type === 'image') {
            $uploadedImages = [];
            foreach ($request->file('images') as $file) {
                $path = $file->store('post-images', 'public');
                // Store relative path that matches frontend pattern
                $uploadedImages[] = '/storage/' . $path;
            }
            // Store multiple images as JSON array
            $mediaUrl = json_encode($uploadedImages);
        }

        // Handle YouTube thumbnail
        if ($request->type === 'youtube' && $request->media_url) {
            $mediaThumbnail = $this->getYouTubeThumbnail($request->media_url);
        }

        $postData = [
            'user_id' => $user->id,
            'content' => $request->content ?: null, // Allow null for image and youtube types
            'type' => $request->type,
            'media_url' => $mediaUrl,
            'media_thumbnail' => $mediaThumbnail
        ];

        // Add agency_id if manager is creating an agency post
        if ($isManager && $request->has('agency_id') && $request->agency_id) {
            // Verify the manager belongs to this agency
            if ($user->agency_id == $request->agency_id) {
                $postData['agency_id'] = $request->agency_id;
            }
        } elseif ($isManager && $user->agency_id) {
            // If manager doesn't specify agency_id, use their own agency
            $postData['agency_id'] = $user->agency_id;
        }

        $post = Post::create($postData);

        return redirect()->back()->with('success', 'Post created successfully!');
    }

    private function getYouTubeThumbnail($url)
    {
        if (!$url) return null;
        if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/', $url, $matches)) {
            return "https://img.youtube.com/vi/{$matches[1]}/maxresdefault.jpg";
        }
        return null;
    }

    public function like(Request $request)
    {
        $request->validate([
            'post_id' => 'required|exists:posts,id'
        ]);

        $post = Post::findOrFail($request->post_id);
        $userId = Auth::id();

        // Check if already liked
        $existingLike = PostLike::where('post_id', $post->id)
            ->where('user_id', $userId)
            ->first();

        if ($existingLike) {
            // Unlike
            $existingLike->delete();
            $liked = false;
        } else {
            // Like
            $like = PostLike::create([
                'post_id' => $post->id,
                'user_id' => $userId
            ]);
            $liked = true;
            Activity::record('post.liked', $userId, $like, ['post_id' => $post->id]);
        }

        return redirect()->back();
    }

    public function comment(Request $request)
    {
        $request->validate([
            'post_id' => 'required|exists:posts,id',
            'content' => 'required|string|max:1000',
            'parent_id' => 'nullable|exists:post_comments,id'
        ]);

        $comment = PostComment::create([
            'post_id' => $request->post_id,
            'user_id' => Auth::id(),
            'parent_id' => $request->parent_id,
            'content' => $request->content
        ]);

        Activity::record('post.commented', Auth::id(), $comment, [
            'post_id' => $comment->post_id,
            'content_excerpt' => \Illuminate\Support\Str::limit($comment->content, 80),
            'parent_id' => $comment->parent_id,
        ]);

        $comment->load(['user.roles', 'user.profile']);

        \Log::info('Comment created', [
            'comment_id' => $comment->id,
            'post_id' => $comment->post_id,
            'user_id' => $comment->user_id,
            'parent_id' => $comment->parent_id,
        ]);

        // If this is a reply, send notification to the parent comment owner
        if ($request->parent_id) {
            $parentComment = PostComment::with('user')->findOrFail($request->parent_id);
            
            \Log::info('Comment reply detected', [
                'parent_comment_id' => $parentComment->id,
                'parent_user_id' => $parentComment->user_id,
                'parent_email' => $parentComment->user?->email,
                'replier_id' => Auth::id(),
                'mail_driver' => config('mail.default'),
            ]);

            // Don't send notification if replying to own comment
            if ($parentComment->user_id === Auth::id()) {
                \Log::info('Reply notification skipped (self-reply).', [
                    'parent_comment_id' => $parentComment->id,
                    'replier_id' => Auth::id(),
                ]);
            } elseif (!$parentComment->user?->email) {
                \Log::warning('Reply notification skipped (missing parent email).', [
                    'parent_comment_id' => $parentComment->id,
                    'parent_user_id' => $parentComment->user_id,
                ]);
            } else {
                try {
                    Mail::to($parentComment->user->email)->send(
                        new CommentReplyNotification($comment, $parentComment, Auth::user())
                    );
                    \Log::info('Reply notification sent.', [
                        'parent_comment_id' => $parentComment->id,
                        'parent_email' => $parentComment->user->email,
                        'replier_id' => Auth::id(),
                    ]);
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    \Log::error('Failed to send comment reply notification: ' . $e->getMessage(), [
                        'parent_comment_id' => $parentComment->id,
                        'parent_email' => $parentComment->user->email,
                        'replier_id' => Auth::id(),
                        'mail_driver' => config('mail.default'),
                    ]);
                }
            }
        }

        return redirect()->back();
    }

    public function updateComment(Request $request, PostComment $comment)
    {
        $user = Auth::user();
        
        // Only the comment owner can update
        if ($comment->user_id !== $user->id && !$user->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'content' => 'required|string|max:1000'
        ]);

        $comment->update([
            'content' => $request->content
        ]);

        return redirect()->back()->with('success', 'Comment updated successfully!');
    }

    public function deleteComment(PostComment $comment)
    {
        $user = Auth::user();
        $comment->load('user');

        $isOwner = $comment->user_id === $user->id;
        $isAdmin = $user->hasRole('admin');
        $matchmakerDeletingUserComment = $user->hasRole('matchmaker') && $comment->user && $comment->user->hasRole('user');

        if (!$isOwner && !$isAdmin && !$matchmakerDeletingUserComment) {
            abort(403, 'Unauthorized');
        }

        $comment->delete();

        return redirect()->back()->with('success', 'Comment deleted successfully!');
    }

    public function destroy(Post $post)
    {
        $user = Auth::user();
        
        // Only the post author can delete (or admin)
        if ($post->user_id !== $user->id && !$user->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }

        // Delete uploaded images if they exist
        if ($post->type === 'image' && $post->media_url) {
            $decoded = json_decode($post->media_url, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                foreach ($decoded as $imageUrl) {
                    // Extract path from URL (handle both /storage/... and full URLs)
                    if (strpos($imageUrl, '/storage/') === 0) {
                        $path = str_replace('/storage/', '', $imageUrl);
                    } else {
                        // Handle full URLs
                        $parsed = parse_url($imageUrl);
                        $path = str_replace('/storage/', '', $parsed['path'] ?? '');
                    }
                    if ($path) {
                        Storage::disk('public')->delete($path);
                    }
                }
            } elseif (strpos($post->media_url, '/storage/') === 0) {
                $path = str_replace('/storage/', '', $post->media_url);
                Storage::disk('public')->delete($path);
            }
        }

        $post->delete();

        return redirect()->back()->with('success', 'Post deleted successfully!');
    }

    public function staffNewsFeed()
    {
        $user = Auth::user();
        $role = $this->getUserRole($user);
        
        // Get all staff user IDs (matchmakers, managers, admins)
        $matchmakerIds = User::role('matchmaker')->pluck('id');
        $managerIds = User::role('manager')->pluck('id');
        $adminIds = User::role('admin')->pluck('id');
        
        // Merge all staff IDs
        $staffIds = $matchmakerIds->merge($managerIds)->merge($adminIds)->unique();
        
        // Get posts from all staff members (limit for merge). Exclude shadow posts for activities.
        $postsQuery = Post::with([
            'user.profile',
            'user.roles',
            'agency',
            'likes.user.profile',
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user.roles', 'user.profile', 'replies.user.roles', 'replies.user.profile']);
            }
        ])
            ->whereIn('user_id', $staffIds)
            ->whereNull('activity_id')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        if (Auth::check()) {
            $postsQuery->each(function ($post) {
                $post->is_liked = $post->isLikedBy(Auth::id());
                $post->likes_count = $post->likes_count;
                $post->comments_count = $post->comments_count;
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

        // Get activities for staff feed (limit for merge)
        $staffIdsArray = $staffIds->values()->all();
        $activitiesQuery = empty($staffIdsArray)
            ? collect()
            : Activity::query()
                ->forStaffFeed($staffIdsArray, null)
                ->with(['actor.profile', 'subject'])
                ->limit(50)
                ->get();

        $feedItems = collect();
        foreach ($postsQuery as $post) {
            $feedItems->push([
                'type' => 'post',
                'created_at' => $post->created_at->toIso8601String(),
                'post' => $post,
            ]);
        }

        $postRelations = [
            'user.profile',
            'user.roles',
            'agency',
            'likes.user.profile',
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user.roles', 'user.profile', 'replies.user.roles', 'replies.user.profile']);
            },
        ];

        $allowedActivityTypes = ['member.added', 'prospect.added', 'post.commented', 'post.liked'];
        foreach ($activitiesQuery as $activity) {
            if (! in_array($activity->type, $allowedActivityTypes, true)) {
                continue;
            }
            $description = $this->activityDescription($activity);
            $shadowPost = Post::firstOrCreate(
                ['activity_id' => $activity->id],
                [
                    'user_id' => $activity->actor_id,
                    'content' => $description,
                    'type' => 'text',
                    'created_at' => $activity->created_at,
                    'updated_at' => $activity->created_at,
                ]
            );
            $shadowPost->load($postRelations);
            if (Auth::check()) {
                $shadowPost->is_liked = $shadowPost->isLikedBy(Auth::id());
                $shadowPost->likes_count = $shadowPost->likes_count;
                $shadowPost->comments_count = $shadowPost->comments_count;
            }
            $feedItems->push([
                'type' => 'activity',
                'created_at' => $activity->created_at->toIso8601String(),
                'activity' => $this->formatActivityForFeed($activity),
                'post' => $shadowPost,
            ]);
        }

        $feedItems = $feedItems->sortByDesc('created_at')->values();

        $perPage = 15;
        $page = (int) request('page', 1);
        $total = $feedItems->count();
        $slice = $feedItems->slice(($page - 1) * $perPage, $perPage)->values();
        $feed = new \Illuminate\Pagination\LengthAwarePaginator(
            $slice->all(),
            $total,
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()]
        );

        $statistics = $this->getStaffStatistics($user, $role);

        return Inertia::render('staff/news-feed', [
            'feed' => $feed,
            'statistics' => $statistics,
        ]);
    }

    private function formatActivityForFeed(Activity $activity): array
    {
        $actor = $activity->actor;
        $payload = [
            'id' => $activity->id,
            'type' => $activity->type,
            'actor_id' => $activity->actor_id,
            'actor' => $actor ? [
                'id' => $actor->id,
                'name' => $actor->name,
                'username' => $actor->username,
                'profile_picture' => $actor->profile_picture,
                'profile' => $actor->relationLoaded('profile') && $actor->profile
                    ? ['id' => $actor->profile->id]
                    : null,
            ] : null,
            'subject_type' => $activity->subject_type,
            'subject_id' => $activity->subject_id,
            'metadata' => $activity->metadata ?? [],
            'created_at' => $activity->created_at->toIso8601String(),
            'description' => $this->activityDescription($activity),
            'description_display' => $this->activityDescriptionDisplay($activity),
        ];

        $subject = $activity->subject;
        if ($subject) {
            $payload['subject'] = $this->minimalSubjectPayload($activity->type, $subject);
        } else {
            $payload['subject'] = null;
        }

        return $payload;
    }

    private function activityDescription(Activity $activity): string
    {
        $subject = $activity->subject;
        $meta = $activity->metadata ?? [];

        $username = null;
        if ($subject instanceof \App\Models\User) {
            $username = $subject->username ?? $subject->name;
        }
        $username = $username ?? $meta['username'] ?? $meta['member_username'] ?? $meta['prospect_username'] ?? null;

        $postOwner = $this->getActivityPostOwnerUsername($activity);

        return match ($activity->type) {
            'member.added' => 'Nouveau membre : ' . ($username ?? $meta['member_name'] ?? '—'),
            'prospect.added' => 'Nouveau prospect : ' . ($username ?? $meta['prospect_name'] ?? '—'),
            'post.commented' => ($activity->actor?->name ?? 'Staff') . ' a commenté une publication de @' . ($postOwner ?? '—'),
            'post.liked' => ($activity->actor?->name ?? 'Staff') . ' a aimé une publication de @' . ($postOwner ?? '—'),
            default => ($activity->actor?->name ?? 'Staff') . ' a effectué une action',
        };
    }

    private function getActivityPostOwnerUsername(Activity $activity): ?string
    {
        $subject = $activity->subject;
        if ($subject && method_exists($subject, 'post')) {
            $post = $subject->post;
            if ($post && $post->relationLoaded('user') && $post->user) {
                return $post->user->username ?? $post->user->name ?? null;
            }
            if ($post && ! $post->relationLoaded('user')) {
                $post->load('user');
                return $post->user?->username ?? $post->user?->name ?? null;
            }
        }
        return null;
    }

    /**
     * Return activity description as structured object for display (activity label + username to style).
     */
    private function activityDescriptionDisplay(Activity $activity): array
    {
        $subject = $activity->subject;
        $meta = $activity->metadata ?? [];

        $username = null;
        if ($subject instanceof \App\Models\User) {
            $username = $subject->username ?? $subject->name;
        }
        $username = $username ?? $meta['username'] ?? $meta['member_username'] ?? $meta['prospect_username'] ?? null;

        $postOwner = $this->getActivityPostOwnerUsername($activity);
        $postOwnerDisplay = $postOwner ? '@' . $postOwner : '—';

        $result = match ($activity->type) {
            'member.added' => [
                'activity' => 'Nouveau membre : ',
                'username' => $username ?? $meta['member_name'] ?? '—',
            ],
            'prospect.added' => [
                'activity' => 'Nouveau prospect : ',
                'username' => $username ?? $meta['prospect_name'] ?? '—',
            ],
            'post.commented' => [
                'activity' => ($activity->actor?->name ?? 'Staff') . ' a commenté une publication de ',
                'username' => $postOwnerDisplay,
            ],
            'post.liked' => [
                'activity' => ($activity->actor?->name ?? 'Staff') . ' a aimé une publication de ',
                'username' => $postOwnerDisplay,
            ],
            default => [
                'activity' => ($activity->actor?->name ?? 'Staff') . ' a effectué une action',
                'username' => null,
            ],
        };

        return $result;
    }

    private function minimalSubjectPayload(string $type, $subject): ?array
    {
        if ($subject === null) {
            return null;
        }

        if ($subject instanceof User) {
            return [
                'id' => $subject->id,
                'name' => $subject->name,
                'username' => $subject->username,
            ];
        }
        if ($subject instanceof \App\Models\Proposition) {
            $subject->load(['referenceUser.profile', 'compatibleUser.profile']);
            $ref = $subject->referenceUser;
            $comp = $subject->compatibleUser;
            return [
                'id' => $subject->id,
                'reference_user_id' => $subject->reference_user_id,
                'compatible_user_id' => $subject->compatible_user_id,
                'user_a' => $ref ? [
                    'id' => $ref->id,
                    'username' => $ref->username,
                    'name' => $ref->name,
                    'profile_picture_path' => $ref->profile?->profile_picture_path,
                ] : null,
                'user_b' => $comp ? [
                    'id' => $comp->id,
                    'username' => $comp->username,
                    'name' => $comp->name,
                    'profile_picture_path' => $comp->profile?->profile_picture_path,
                ] : null,
            ];
        }
        if ($subject instanceof \App\Models\AppointmentRequest) {
            return [
                'id' => $subject->id,
                'name' => $subject->name,
                'preferred_date' => $subject->preferred_date?->toIso8601String(),
                'status' => $subject->status,
            ];
        }
        if ($subject instanceof Post) {
            return [
                'id' => $subject->id,
                'content_excerpt' => \Illuminate\Support\Str::limit($subject->content, 80),
            ];
        }
        if ($subject instanceof PostComment) {
            return [
                'id' => $subject->id,
                'post_id' => $subject->post_id,
                'content_excerpt' => \Illuminate\Support\Str::limit($subject->content, 80),
            ];
        }
        if ($subject instanceof PostLike) {
            return [
                'id' => $subject->id,
                'post_id' => $subject->post_id,
            ];
        }

        return ['id' => $subject->id];
    }

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

    private function getStaffStatistics(User $user, ?string $role): array
    {
        $stats = [];

        if ($role === 'matchmaker') {
            // Matchmaker statistics
            $baseQuery = User::role('user')
                ->where(function($query) use ($user) {
                    $query->where('approved_by', $user->id)
                          ->orWhere('assigned_matchmaker_id', $user->id);
                });

            $prospectsQuery = (clone $baseQuery)->where('status', 'prospect');
            $clientsQuery = (clone $baseQuery)->whereIn('status', ['client', 'en_rdv']);
            $membersQuery = (clone $baseQuery)->where('status', 'member');

            // For untreated prospects, we need prospects assigned to this matchmaker that are not validated
            $untreatedProspectsQuery = User::role('user')
                ->where('status', 'prospect')
                ->where('assigned_matchmaker_id', $user->id)
                ->whereNull('approved_at');

            $stats = [
                'prospects' => [
                    'total' => $prospectsQuery->count(),
                    'late' => $prospectsQuery->where('created_at', '<', now()->subDays(7))->whereNull('approved_at')->count(),
                    'untreated' => $untreatedProspectsQuery->count(),
                ],
                'clients' => [
                    'total' => $clientsQuery->count(),
                    'inAppointment' => (clone $baseQuery)->where('status', 'en_rdv')->count(),
                    'notInAppointment' => (clone $baseQuery)->where('status', 'client')->count(),
                    'notContacted' => (clone $baseQuery)->where('status', 'client')->where(function($q) {
                        $q->where('updated_at', '<', now()->subWeek())
                          ->orWhereNull('updated_at');
                    })->count(),
                ],
                'activeMembers' => [
                    'total' => $membersQuery->count(),
                    'notUpToDate' => $membersQuery->where(function($q) {
                        $q->whereHas('profile', function($profileQuery) {
                            $profileQuery->where('is_completed', false);
                        })->orWhereDoesntHave('subscriptions', function($subQuery) {
                            $subQuery->where('status', 'active')
                              ->where('subscription_end', '>=', now());
                        });
                    })->count(),
                ],
                'latestMembers' => (clone $baseQuery)
                    ->whereIn('status', ['member', 'client'])
                    ->with([
                        'profile:id,user_id,profile_picture_path',
                        'assignedMatchmaker:id,name',
                        'agency:id,name'
                    ])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'name', 'email', 'username', 'created_at', 'assigned_matchmaker_id', 'agency_id'])
                    ->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'username' => $user->username,
                            'created_at' => $user->created_at,
                            'profile_picture' => $user->profile->profile_picture_path ?? null,
                            'assigned_matchmaker_name' => $user->assignedMatchmaker->name ?? null,
                            'agency_name' => $user->agency->name ?? null,
                        ];
                    }),
            ];
        } elseif ($role === 'manager' && $user->agency_id) {
            // Manager statistics
            $baseQuery = User::role('user')
                ->where(function($query) use ($user) {
                    $query->where('agency_id', $user->agency_id)
                          ->orWhere('validated_by_manager_id', $user->id);
                });

            $prospectsQuery = (clone $baseQuery)->where('status', 'prospect');
            $clientsQuery = (clone $baseQuery)->whereIn('status', ['client', 'en_rdv']);
            $membersQuery = (clone $baseQuery)->where('status', 'member');

            // For untreated prospects, we need prospects from manager's agency that are not validated
            $untreatedProspectsQuery = User::role('user')
                ->where('status', 'prospect')
                ->where('agency_id', $user->agency_id)
                ->whereNull('approved_at');

            $stats = [
                'prospects' => [
                    'total' => $prospectsQuery->count(),
                    'late' => $prospectsQuery->where('created_at', '<', now()->subDays(7))->whereNull('approved_at')->count(),
                    'untreated' => $untreatedProspectsQuery->count(),
                ],
                'clients' => [
                    'total' => $clientsQuery->count(),
                    'inAppointment' => (clone $baseQuery)->where('status', 'en_rdv')->count(),
                    'notInAppointment' => (clone $baseQuery)->where('status', 'client')->count(),
                    'notContacted' => (clone $baseQuery)->where('status', 'client')->where(function($q) {
                        $q->where('updated_at', '<', now()->subWeek())
                          ->orWhereNull('updated_at');
                    })->count(),
                ],
                'activeMembers' => [
                    'total' => $membersQuery->count(),
                    'notUpToDate' => $membersQuery->where(function($q) {
                        $q->whereHas('profile', function($profileQuery) {
                            $profileQuery->where('is_completed', false);
                        })->orWhereDoesntHave('subscriptions', function($subQuery) {
                            $subQuery->where('status', 'active')
                              ->where('subscription_end', '>=', now());
                        });
                    })->count(),
                ],
                'productionByAgency' => $this->getProductionByAgency($user->agency_id),
                'matchmakers' => User::role('matchmaker')
                    ->where('agency_id', $user->agency_id)
                    ->where('approval_status', 'approved')
                    ->limit(5)
                    ->get(['id', 'name', 'email', 'profile_picture']),
                'latestMembers' => (clone $baseQuery)
                    ->whereIn('status', ['member', 'client'])
                    ->with([
                        'profile:id,user_id,profile_picture_path',
                        'assignedMatchmaker:id,name',
                        'agency:id,name'
                    ])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'name', 'email', 'username', 'created_at', 'assigned_matchmaker_id', 'agency_id'])
                    ->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'username' => $user->username,
                            'created_at' => $user->created_at,
                            'profile_picture' => $user->profile->profile_picture_path ?? null,
                            'assigned_matchmaker_name' => $user->assignedMatchmaker->name ?? null,
                            'agency_name' => $user->agency->name ?? null,
                        ];
                    }),
            ];
        } elseif ($role === 'admin') {
            // Admin statistics
            $prospectsQuery = User::role('user')->where('status', 'prospect');
            $clientsQuery = User::role('user')->whereIn('status', ['client', 'en_rdv']);
            $membersQuery = User::role('user')->where('status', 'member');

            // For untreated prospects, we need all prospects that are not validated
            $untreatedProspectsQuery = User::role('user')
                ->where('status', 'prospect')
                ->whereNull('approved_at');

            $stats = [
                'prospects' => [
                    'total' => $prospectsQuery->count(),
                    'late' => $prospectsQuery->where('created_at', '<', now()->subDays(7))->whereNull('approved_at')->count(),
                    'untreated' => $untreatedProspectsQuery->count(),
                ],
                'clients' => [
                    'total' => $clientsQuery->count(),
                    'inAppointment' => User::role('user')->where('status', 'en_rdv')->count(),
                    'notInAppointment' => User::role('user')->where('status', 'client')->count(),
                    'notContacted' => User::role('user')->where('status', 'client')->where(function($q) {
                        $q->where('updated_at', '<', now()->subWeek())
                          ->orWhereNull('updated_at');
                    })->count(),
                ],
                'activeMembers' => [
                    'total' => $membersQuery->count(),
                    'notUpToDate' => $membersQuery->where(function($q) {
                        $q->whereHas('profile', function($profileQuery) {
                            $profileQuery->where('is_completed', false);
                        })->orWhereDoesntHave('subscriptions', function($subQuery) {
                            $subQuery->where('status', 'active')
                              ->where('subscription_end', '>=', now());
                        });
                    })->count(),
                ],
                'productionByAgency' => $this->getProductionByAgency(),
                'matchmakers' => User::role('matchmaker')
                    ->where('approval_status', 'approved')
                    ->limit(5)
                    ->get(['id', 'name', 'email', 'profile_picture']),
                'latestMembers' => User::role('user')
                    ->whereIn('status', ['member', 'client'])
                    ->with('profile:id,user_id,profile_picture_path')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(['id', 'name', 'email'])
                    ->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'profile_picture' => $user->profile->profile_picture_path ?? null,
                        ];
                    }),
            ];
        }

        return $stats;
    }

    private function getProductionByAgency(?int $agencyId = null): array
    {
        $agencies = $agencyId 
            ? Agency::where('id', $agencyId)->get()
            : Agency::all();

        $production = [];
        foreach ($agencies as $agency) {
            $usersCount = User::role('user')
                ->where('agency_id', $agency->id)
                ->whereIn('status', ['member', 'client', 'client_expire'])
                ->count();
            
            $totalUsers = User::role('user')->whereIn('status', ['member', 'client', 'client_expire'])->count();
            $percentage = $totalUsers > 0 ? round(($usersCount / $totalUsers) * 100, 1) : 0;

            $production[] = [
                'name' => $agency->name,
                'count' => $usersCount,
                'percentage' => $percentage,
            ];
        }

        return $production;
    }
}