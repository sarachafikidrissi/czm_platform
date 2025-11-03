import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';

export default function PostsIndex({ posts }) {
    return (
        <AppLayout>
            <Head title="Posts" />
            <div className="min-h-screen bg-background">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground">Posts</h1>
                        <p className="text-muted-foreground">Share your thoughts and connect with others</p>
                    </div>

                    {/* Create Post Form */}
                    <CreatePost />

                    {/* Posts Feed */}
                    <div className="space-y-4">
                        {posts.data && posts.data.length > 0 ? (
                            posts.data.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No posts yet. Be the first to share something!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
