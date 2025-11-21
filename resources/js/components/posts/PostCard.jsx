import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Trash2 } from 'lucide-react';
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
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Handle multiple images
    const imageUrls = post.media_urls || (post.media_url ? [post.media_url] : []);

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
        router.delete(`/posts/${post.id}`, {
            onSuccess: () => {
                setShowDeleteDialog(false);
            },
        });
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
                        <div className="bg-muted flex h-15 w-15 items-center justify-center rounded-full border-2 border-[#096725]">
                            {/* <span className="text-sm font-medium text-gray-600 border-[#096725] border-2"> */}
                            {post.user?.profile_picture ? (
                                <img
                                    src={`/storage/${post.user.profile_picture}`}
                                    alt={post.user.name}
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-muted-foreground text-sm font-medium">{post.user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                            {/* </span> */}
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-800">{post.user?.name || 'Unknown User'}</h3>
                            <p className="text-muted-foreground text-sm">{formatTimeAgo(post.created_at)}</p>
                        </div>
                    </div>
                    {auth.user.id === post.user_id && (
                        <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-error hover:opacity-80">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Post Content */}
                <div className="mb-4">
                    <p className="whitespace-pre-wrap text-gray-900">{post.content}</p>
                </div>

                {/* Media Content */}
                {post.type === 'image' && imageUrls.length > 0 && (
                    <div className="mb-4">
                        <div className="relative">
                            <img
                                src={imageUrls[currentImageIndex]}
                                alt={`Post image ${currentImageIndex + 1}`}
                                className="bg-muted max-h-96 w-full rounded-lg object-cover"
                            />
                            {imageUrls.length > 1 && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                        onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : imageUrls.length - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                                        onClick={() => setCurrentImageIndex((prev) => (prev < imageUrls.length - 1 ? prev + 1 : 0))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1">
                                        {imageUrls.map((_, index) => (
                                            <button
                                                key={index}
                                                className={`h-2 w-2 rounded-full transition-colors ${
                                                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                                }`}
                                                onClick={() => setCurrentImageIndex(index)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {post.type === 'youtube' && post.media_url && (
                    <div className="mb-4">
                        <div className="bg-muted relative h-64 w-full overflow-hidden rounded-lg">
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
                <div className="text-muted-foreground mb-4 flex items-center gap-4 text-sm">
                    <span>{likesCount} j'aime</span>
                    <span>{commentsCount} commentaires</span>
                </div>

                {/* Action Buttons */}
                <div className="border-border flex items-center gap-4 border-t pt-4">
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
                        className="text-muted-foreground flex items-center gap-2"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className='max-md:text-xs'>{showComments ? 'Masquer les commentaires' : 'Voir les commentaires'}</span>
                        {/* {showComments ? 'Masquer les commentaires' : 'Voir les commentaires'} */}
                    </Button>
                </div>

                {/* Comments Section */}
                {showComments && (
                    <div className="border-border mt-4 border-t pt-4">
                        {/* Existing Comments */}
                        {comments && comments.length > 0 && (
                            <div className="mb-4 space-y-3">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-600 bg-gray-200">
                                            {comment.user?.roles?.[0]?.name !== 'user' && comment.user?.profile_picture ? (
                                                <img
                                                    src={`/storage/${comment.user.profile_picture}`}
                                                    alt={comment.user.name}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : comment.user?.roles?.[0]?.name === 'user' && comment.user?.profile?.profile_picture_path ? (
                                                <img
                                                    src={`/storage/${comment.user.profile.profile_picture_path}`}
                                                    alt={comment.user.name}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs font-medium text-gray-600">
                                                    {comment.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-muted rounded-lg p-3">
                                                <h4 className="text-foreground text-sm font-medium">{comment.user?.name || 'Unknown User'}</h4>
                                                <p className="text-foreground mt-1 text-sm">{comment.content}</p>
                                            </div>
                                            <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
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
                        <form onSubmit={handleComment} className="flex gap-3 max-md:flex-col">
                            <div className='flex items-center gap-3'>
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
                            </div>
                            <Button type="submit" disabled={isCommenting || !newComment.trim()} className="bg-error hover:opacity-90">
                                {isCommenting ? '...' : 'Commentaire'}
                            </Button>
                        </form>
                    </div>
                )}
            </CardContent>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>This action cannot be undone. This will permanently delete your post.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
