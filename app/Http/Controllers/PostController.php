<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use App\Models\PostComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PostController extends Controller
{
    public function index()
    {
        $posts = Post::with(['user.profile', 'agency', 'likes', 'comments.user.roles', 'comments.user.profile'])
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
        
        $request->validate([
            'content' => 'required|string|max:2000',
            'type' => 'required|in:text,image,youtube',
            'media_url' => 'nullable|string|max:500',
            'media_thumbnail' => 'nullable|string|max:500',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max per image
            'agency_id' => 'nullable|exists:agencies,id'
        ]);

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
            'content' => $request->content,
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
            PostLike::create([
                'post_id' => $post->id,
                'user_id' => $userId
            ]);
            $liked = true;
        }

        return redirect()->back();
    }

    public function comment(Request $request)
    {
        $request->validate([
            'post_id' => 'required|exists:posts,id',
            'content' => 'required|string|max:1000'
        ]);

        $comment = PostComment::create([
            'post_id' => $request->post_id,
            'user_id' => Auth::id(),
            'content' => $request->content
        ]);

        $comment->load('user');

        return redirect()->back();
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
}