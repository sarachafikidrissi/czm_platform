<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostLike;
use App\Models\PostComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PostController extends Controller
{
    public function index()
    {
        $posts = Post::with(['user.profile', 'likes', 'comments.user.roles', 'comments.user.profile'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Add like status for current user and append accessor attributes
        if (Auth::check()) {
            $posts->getCollection()->each(function ($post) {
                $post->is_liked = $post->isLikedBy(Auth::id());
                $post->likes_count = $post->likes_count;
                $post->comments_count = $post->comments_count;
            });
        }

        return Inertia::render('posts/index', [
            'posts' => $posts
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'content' => 'required|string|max:2000',
            'type' => 'required|in:text,image,youtube',
            'media_url' => 'nullable|string|max:500',
            'media_thumbnail' => 'nullable|string|max:500'
        ]);

        $post = Post::create([
            'user_id' => Auth::id(),
            'content' => $request->content,
            'type' => $request->type,
            'media_url' => $request->media_url,
            'media_thumbnail' => $request->media_thumbnail
        ]);

        return redirect()->back()->with('success', 'Post created successfully!');
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
        // Only the post author can delete
        if ($post->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $post->delete();

        return redirect()->back()->with('success', 'Post deleted successfully!');
    }
}