import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share, MoreHorizontal, Trash2 } from 'lucide-react';
import { usePage } from '@inertiajs/react';

export default function PostCard({ post }) {
    const { auth } = usePage().props;
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [comments, setComments] = useState(post.comments || []);

    // Debug logging
    console.log('Post data:', {
        id: post.id,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        is_liked: post.is_liked,
        likes: post.likes,
        comments: post.comments
    });

    const handleLike = () => {
        setIsLiking(true);
        
        // Optimistically update the UI
        const newLikedState = !isLiked;
        const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
        
        setIsLiked(newLikedState);
        setLikesCount(newLikesCount);
        
        router.post('/posts/like', {
            post_id: post.id
        }, {
            onFinish: () => {
                setIsLiking(false);
            },
            onError: () => {
                // Revert on error
                setIsLiked(!newLikedState);
                setLikesCount(isLiked ? likesCount + 1 : likesCount - 1);
                setIsLiking(false);
            }
        });
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
            created_at: new Date().toISOString()
        };
        
        // Update comments count and add comment to list
        setCommentsCount(commentsCount + 1);
        setComments([...comments, tempComment]);
        setNewComment('');
        
        router.post('/posts/comment', {
            post_id: post.id,
            content: commentContent
        }, {
            onFinish: () => {
                setIsCommenting(false);
            },
            onError: () => {
                // Revert on error
                setCommentsCount(commentsCount);
                setComments(comments.filter(c => c.id !== tempComment.id));
                setNewComment(commentContent);
                setIsCommenting(false);
            }
        });
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
    console.log(post);
    

    return (
        <Card className="mb-4">
            <CardContent className="p-6">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                                {post.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{post.user?.name || 'Unknown User'}</h3>
                            <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
                        </div>
                    </div>
                    {auth.user.id === post.user_id && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Post Content */}
                <div className="mb-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Media Content */}
                {post.type === 'image' && post.media_url && (
                    <div className="mb-4">
                        <img 
                            src={post.media_url} 
                            alt="Post image" 
                            className="w-full max-h-96 object-cover rounded-lg"
                        />
                    </div>
                )}

                {post.type === 'youtube' && post.media_url && (
                    <div className="mb-4">
                        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                            <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeVideoId(post.media_url)}`}
                                title="YouTube video"
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* Engagement Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <span>{likesCount} j'aime</span>
                    <span>{commentsCount} commentaires</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`flex items-center gap-2 ${
                            isLiked ? 'text-red-600' : 'text-gray-600'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        J'aime
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-gray-600"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Commentaire
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-gray-600"
                    >
                        <Share className="w-4 h-4" />
                        Partager
                    </Button>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                        {/* Existing Comments */}
                        {comments && comments.length > 0 && (
                            <div className="space-y-3 mb-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                                {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <h4 className="font-medium text-sm text-gray-900">{comment.user?.name || 'Unknown User'}</h4>
                                                <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>{formatTimeAgo(comment.created_at)}</span>
                                                <button className="hover:text-gray-700">J'aime</button>
                                                <button className="hover:text-gray-700">Répondre</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Comment Form */}
                        <form onSubmit={handleComment} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                    {auth.user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <Textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Laisser un commentaire..."
                                    className="min-h-[40px] resize-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isCommenting || !newComment.trim()}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isCommenting ? '...' : 'Commentaire'}
                            </Button>
                        </form>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
