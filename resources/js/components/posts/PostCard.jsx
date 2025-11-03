import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { router, usePage } from '@inertiajs/react';
import { Heart, MessageCircle, Share, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function PostCard({ post }) {
    const { auth } = usePage().props;
    const [showComments, setShowComments] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [comments, setComments] = useState(post.comments || []);
    console.log("comments are ", comments);

    


    const handleLike = () => {
        setIsLiking(true);

        // Optimistically update the UI
        const newLikedState = !isLiked;
        const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;

        setIsLiked(newLikedState);
        setLikesCount(newLikesCount);

        router.post(
            '/posts/like',
            {
                post_id: post.id,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsLiking(false);
                },
                onError: () => {
                    // Revert on error
                    setIsLiked(!newLikedState);
                    setLikesCount(isLiked ? likesCount + 1 : likesCount - 1);
                    setIsLiking(false);
                },
            },
        );
    };

    const handleComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const commentContent = newComment.trim();
        setIsCommenting(true);

        // Optimistically add comment to UI
        const tempComment = {
            id: Date.now(), // Temporary ID
            content: commentContent,
            user: auth.user,
            created_at: new Date().toISOString(),
        };

        // Update comments count and add comment to list
        setCommentsCount(commentsCount + 1);
        setComments([...comments, tempComment]);
        setNewComment('');

        router.post(
            '/posts/comment',
            {
                post_id: post.id,
                content: commentContent,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsCommenting(false);
                },
                onError: () => {
                    // Revert on error
                    setCommentsCount(commentsCount);
                    setComments(comments.filter((c) => c.id !== tempComment.id));
                    setNewComment(commentContent);
                    setIsCommenting(false);
                },
            },
        );
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this post?')) {
            router.delete(`/posts/${post.id}`);
        }
    };

    const formatTimeAgo = (date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;
        return postDate.toLocaleDateString();
    };

    const getYouTubeVideoId = (url) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        return match ? match[1] : null;
    };

    return (
        <Card className="mb-4">
            <CardContent className="p-6">
                {/* Post Header */}
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <span className="text-sm font-medium text-gray-600">
                                {post.user?.profile_picture ? (
                                    <img
                                        src={`/storage/${post.user.profile_picture}`}
                                        alt={post.user.name}
                                        className="h-full w-full object-cover rounded-full"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-muted-foreground">{post.user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                                )}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">{post.user?.name || 'Unknown User'}</h3>
                            <p className="text-sm text-muted-foreground">{formatTimeAgo(post.created_at)}</p>
                        </div>
                    </div>
                    {auth.user.id === post.user_id && (
                        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-error hover:opacity-80">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Post Content */}
                <div className="mb-4">
                    <p className="whitespace-pre-wrap text-gray-900">{post.content}</p>
                </div>

                {/* Media Content */}
                {post.type === 'image' && post.media_url && (
                    <div className="mb-4">
                        <img src={post.media_url} alt="Post image" className="max-h-96 w-full rounded-lg object-cover" />
                    </div>
                )}

                {post.type === 'youtube' && post.media_url && (
                    <div className="mb-4">
                        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
                            <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(post.media_url)}`}
                                title="YouTube video"
                                className="h-full w-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* Engagement Stats */}
                <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{likesCount} j'aime</span>
                    <span>{commentsCount} commentaires</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 border-t border-border pt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`flex items-center gap-2 ${isLiked ? 'text-error' : 'text-muted-foreground'}`}
                    >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                        J'aime
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-muted-foreground"
                    >
                        <MessageCircle className="h-4 w-4" />
                        {showComments ? 'Masquer les commentaires' : 'Voir les commentaires'}
                    </Button>

                    <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-600">
                        <Share className="h-4 w-4" />
                        Partager
                    </Button>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="mt-4 border-t border-border pt-4">
                        {/* Existing Comments */}
                        {comments && comments.length > 0 && (
                            <div className="mb-4 space-y-3">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                                            <span className="text-xs font-medium text-gray-600">
                                                {
                                                    comment.user.roles[0].name !== 'user' && comment.user.profile_picture ? (
                                                        <img src={`/storage/${comment.user.profile_picture}`} alt={comment.user.name} className="h-full w-full object-cover rounded-full" />
                                                    ) : comment.user.roles[0].name === 'user' && comment.user.profile.profile_picture_path ? (
                                                        <img src={`/storage/${comment.user.profile.profile_picture_path}`} alt={comment.user.name} className="h-full w-full object-cover rounded-full" />
                                                    ) : (
                                                       comment.user?.name?.charAt(0)?.toUpperCase() || 'U'
                                                    )
                                                }
                                                {/* {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'} */}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="rounded-lg bg-muted p-3">
                                                <h4 className="text-sm font-medium text-foreground">{comment.user?.name || 'Unknown User'}</h4>
                                                <p className="mt-1 text-sm text-foreground">{comment.content}</p>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>{formatTimeAgo(comment.created_at)}</span>
                                                <button className="hover:text-foreground">J'aime</button>
                                                <button className="hover:text-foreground">Répondre</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Comment Form */}
                        <form onSubmit={handleComment} className="flex gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                                <span className="text-xs font-medium text-gray-600">{auth.user.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1">
                                <Textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Laisser un commentaire..."
                                    className="min-h-[40px] resize-none"
                                />
                            </div>
                            <Button type="submit" disabled={isCommenting || !newComment.trim()} className="bg-error hover:opacity-90">
                                {isCommenting ? '...' : 'Commentaire'}
                            </Button>
                        </form>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
