import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Trash2, Edit2, X, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PostCard({ post }) {
    const { auth } = usePage().props;
    const isMatchmaker = auth?.user?.roles?.[0]?.name === 'matchmaker';
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
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const [replyingToCommentId, setReplyingToCommentId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isUpdatingComment, setIsUpdatingComment] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [showLikersModal, setShowLikersModal] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);

    // Handle multiple images
    const imageUrls = post.media_urls || (post.media_url ? [post.media_url] : []);

    // Sync comments when post data updates from server (after Inertia reloads)
    useEffect(() => {
        if (post.comments) {
            setComments(prevComments => {
                // Create a hash of comment IDs to detect real changes
                const newCommentIds = post.comments.map(c => c.id).sort().join(',');
                const currentCommentIds = prevComments.map(c => c.id).sort().join(',');
                
                // Check if current comments OR their replies have temporary IDs (Date.now() values are very large, > 1000000000000)
                const hasTempIds = prevComments.some(c => {
                    // Check top-level comment
                    if (c.id > 1000000000000) return true;
                    // Check replies
                    if (c.replies && c.replies.some(r => r.id > 1000000000000)) return true;
                    return false;
                });
                
                // Only update if:
                // 1. The IDs are different (new comment/reply from server or structure changed)
                // 2. OR the current comments/replies have temporary IDs (need to replace with real IDs)
                if (newCommentIds !== currentCommentIds || hasTempIds) {
                    return post.comments;
                }
                return prevComments; // Keep current state if no meaningful change
            });
            
            // Always sync comment count from server
            if (post.comments_count !== undefined) {
                setCommentsCount(post.comments_count);
            }
        }
    }, [post.comments, post.comments_count, post.id]); // Sync when post changes or comments update

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
            user_id: auth.user.id,
            created_at: new Date().toISOString(),
            replies: [],
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
                only: ['posts'], // Allow Inertia to update posts data (will trigger useEffect to sync)
                onFinish: () => {
                    setIsCommenting(false);
                    // useEffect will sync the comment with real ID from server
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

    const handleReply = (e, parentCommentId) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        const replyText = replyContent.trim();
        setIsReplying(true);

        // Optimistically add reply to UI
        const tempReply = {
            id: Date.now(), // Temporary ID
            content: replyText,
            user: auth.user,
            user_id: auth.user.id,
            created_at: new Date().toISOString(),
        };

        // Update comments state to add reply
        setComments(comments.map(comment => {
            if (comment.id === parentCommentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), tempReply]
                };
            }
            return comment;
        }));

        setReplyContent('');
        setReplyingToCommentId(null);

        router.post(
            '/posts/comment',
            {
                post_id: post.id,
                content: replyText,
                parent_id: parentCommentId,
            },
            {
                preserveScroll: true,
                only: ['posts'], // Allow Inertia to update posts data (will trigger useEffect to sync)
                onFinish: () => {
                    setIsReplying(false);
                    // useEffect will sync the reply with real ID from server
                },
                onError: () => {
                    // Revert on error
                    setComments(comments.map(comment => {
                        if (comment.id === parentCommentId) {
                            return {
                                ...comment,
                                replies: (comment.replies || []).filter(r => r.id !== tempReply.id)
                            };
                        }
                        return comment;
                    }));
                    setReplyContent(replyText);
                    setReplyingToCommentId(parentCommentId);
                    setIsReplying(false);
                },
            },
        );
    };

    const handleEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditCommentContent(comment.content);
    };

    const handleUpdateComment = (e, commentId) => {
        e.preventDefault();
        if (!editCommentContent.trim()) return;

        const updatedContent = editCommentContent.trim();
        setIsUpdatingComment(true);

        // Find the comment to get its original content
        let originalContent = '';
        let isReply = false;
        let parentCommentId = null;

        // Check if it's a top-level comment or a reply
        for (const comment of comments) {
            if (comment.id === commentId) {
                originalContent = comment.content;
                break;
            }
            if (comment.replies) {
                for (const reply of comment.replies) {
                    if (reply.id === commentId) {
                        originalContent = reply.content;
                        isReply = true;
                        parentCommentId = comment.id;
                        break;
                    }
                }
                if (isReply) break;
            }
        }

        // Optimistically update comment in UI
        if (isReply) {
            setComments(comments.map(comment => {
                if (comment.id === parentCommentId) {
                    return {
                        ...comment,
                        replies: (comment.replies || []).map(reply => 
                            reply.id === commentId 
                                ? { ...reply, content: updatedContent }
                                : reply
                        )
                    };
                }
                return comment;
            }));
        } else {
            setComments(comments.map(comment => 
                comment.id === commentId 
                    ? { ...comment, content: updatedContent }
                    : comment
            ));
        }

        setEditingCommentId(null);
        setEditCommentContent('');

        router.put(
            `/posts/comments/${commentId}`,
            {
                content: updatedContent,
            },
            {
                preserveScroll: true,
                only: [],
                onFinish: () => {
                    setIsUpdatingComment(false);
                },
                onError: () => {
                    // Revert on error
                    if (isReply) {
                        setComments(comments.map(comment => {
                            if (comment.id === parentCommentId) {
                                return {
                                    ...comment,
                                    replies: (comment.replies || []).map(reply => 
                                        reply.id === commentId 
                                            ? { ...reply, content: originalContent }
                                            : reply
                                    )
                                };
                            }
                            return comment;
                        }));
                    } else {
                        setComments(comments.map(comment => 
                            comment.id === commentId 
                                ? { ...comment, content: originalContent }
                                : comment
                        ));
                    }
                    setEditingCommentId(commentId);
                    setEditCommentContent(originalContent);
                    setIsUpdatingComment(false);
                },
            },
        );
    };

    const handleDeleteComment = (commentId) => {
        // Find if it's a top-level comment or a reply
        let isReply = false;
        let parentCommentId = null;
        let deletedComment = null;

        for (const comment of comments) {
            if (comment.id === commentId) {
                deletedComment = comment;
                break;
            }
            if (comment.replies) {
                for (const reply of comment.replies) {
                    if (reply.id === commentId) {
                        deletedComment = reply;
                        isReply = true;
                        parentCommentId = comment.id;
                        break;
                    }
                }
                if (isReply) break;
            }
        }

        // Optimistically remove comment from UI
        if (isReply) {
            setComments(comments.map(comment => {
                if (comment.id === parentCommentId) {
                    return {
                        ...comment,
                        replies: (comment.replies || []).filter(reply => reply.id !== commentId)
                    };
                }
                return comment;
            }));
        } else {
            setComments(comments.filter(comment => comment.id !== commentId));
            setCommentsCount(commentsCount - 1);
        }

        setCommentToDelete(null);

        router.delete(`/posts/comments/${commentId}`, {
            preserveScroll: true,
            only: [],
            onSuccess: () => {
                // Success - state already updated
            },
            onError: () => {
                // Revert on error
                if (isReply && deletedComment) {
                    setComments(comments.map(comment => {
                        if (comment.id === parentCommentId) {
                            return {
                                ...comment,
                                replies: [...(comment.replies || []), deletedComment]
                            };
                        }
                        return comment;
                    }));
                } else if (deletedComment) {
                    setComments([...comments, deletedComment]);
                    setCommentsCount(commentsCount);
                }
            },
        });
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditCommentContent('');
    };

    const cancelReply = () => {
        setReplyingToCommentId(null);
        setReplyContent('');
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

    const formatTimeAgoLong = (date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diffMs = now - postDate;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        if (diffMins < 1) return "À l'instant";
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays === 1) return 'Il y a 1 jour';
        if (diffDays < 30) return `Il y a ${diffDays} jours`;
        if (diffMonths === 1) return 'Il y a 1 mois';
        if (diffMonths < 12) return `Il y a ${diffMonths} mois`;
        if (diffYears === 1) return 'Il y a 1 an';
        return `Il y a ${diffYears} ans`;
    };

    const getLikerAvatarUrl = (like) => {
        const user = like?.user;
        if (!user) return null;
        if (user?.profile?.profile_picture_path) return `/storage/${user.profile.profile_picture_path}`;
        if (user?.profile_picture) return `/storage/${user.profile_picture}`;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=dc2626&color=fff`;
    };

    const likers = (post.likes || []).filter((like) => like?.user).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const getCommenterAvatarUrl = (user) => {
        if (!user) return null;
        if (user?.profile?.profile_picture_path) return `/storage/${user.profile.profile_picture_path}`;
        if (user?.profile_picture) return `/storage/${user.profile_picture}`;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=dc2626&color=fff`;
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
                                className="bg-muted max-h-[600px] w-full rounded-lg object-contain"
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
                        <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
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
                    {likesCount > 0 ? (
                        <button
                            type="button"
                            onClick={() => setShowLikersModal(true)}
                            className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                        >
                            {likesCount} j'aime
                        </button>
                    ) : (
                        <span>{likesCount} j'aime</span>
                    )}
                    {commentsCount > 0 ? (
                        <button
                            type="button"
                            onClick={() => setShowCommentsModal(true)}
                            className="hover:text-foreground cursor-pointer underline-offset-2 hover:underline"
                        >
                            {commentsCount} commentaires
                        </button>
                    ) : (
                        <span>{commentsCount} commentaires</span>
                    )}
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
                                    <div key={comment.id} className="space-y-2">
                                        <div className="flex items-start gap-3">
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
                                                {editingCommentId === comment.id ? (
                                                    <form onSubmit={(e) => handleUpdateComment(e, comment.id)} className="space-y-2">
                                                        <Textarea
                                                            value={editCommentContent}
                                                            onChange={(e) => setEditCommentContent(e.target.value)}
                                                            className="min-h-[60px] resize-none"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <Button type="submit" size="sm" disabled={isUpdatingComment || !editCommentContent.trim()}>
                                                                {isUpdatingComment ? '...' : 'Enregistrer'}
                                                            </Button>
                                                            <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                                                                Annuler
                                                            </Button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <>
                                                        <div className="bg-muted rounded-lg p-3">
                                                            <h4 className="text-foreground text-sm font-medium">{comment.user?.name || 'Unknown User'}</h4>
                                                            <p className="text-foreground mt-1 text-sm">{comment.content}</p>
                                                        </div>
                                                        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                                                            <span>{formatTimeAgo(comment.created_at)}</span>
                                                            <button 
                                                                className="hover:text-foreground"
                                                                onClick={() => {
                                                                    setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id);
                                                                    setReplyContent('');
                                                                }}
                                                            >
                                                                Répondre
                                                            </button>
                                                            {auth.user.id === comment.user_id && (
                                                                <>
                                                                    <button 
                                                                        className="hover:text-foreground"
                                                                        onClick={() => handleEditComment(comment)}
                                                                    >
                                                                        Modifier
                                                                    </button>
                                                                    <button 
                                                                        className="hover:text-destructive"
                                                                        onClick={() => setCommentToDelete(comment.id)}
                                                                    >
                                                                        Supprimer
                                                                    </button>
                                                                </>
                                                            )}
                                                            {auth.user.id !== comment.user_id && isMatchmaker && comment.user?.roles?.[0]?.name === 'user' && (
                                                                <button 
                                                                    className="hover:text-destructive"
                                                                    onClick={() => setCommentToDelete(comment.id)}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Reply Form */}
                                        {replyingToCommentId === comment.id && (
                                            <div className="ml-11 mt-2">
                                                <form onSubmit={(e) => handleReply(e, comment.id)} className="flex gap-2">
                                                    <Textarea
                                                        value={replyContent}
                                                        onChange={(e) => setReplyContent(e.target.value)}
                                                        placeholder="Écrire une réponse..."
                                                        className="min-h-[40px] flex-1 resize-none"
                                                    />
                                                    <div className="flex flex-col gap-2">
                                                        <Button type="submit" size="sm" disabled={isReplying || !replyContent.trim()}>
                                                            <Send className="h-4 w-4" />
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="sm" onClick={cancelReply}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="ml-11 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex items-start gap-2">
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-red-600 bg-gray-200">
                                                            {reply.user?.roles?.[0]?.name !== 'user' && reply.user?.profile_picture ? (
                                                                <img
                                                                    src={`/storage/${reply.user.profile_picture}`}
                                                                    alt={reply.user.name}
                                                                    className="h-full w-full rounded-full object-cover"
                                                                />
                                                            ) : reply.user?.roles?.[0]?.name === 'user' && reply.user?.profile?.profile_picture_path ? (
                                                                <img
                                                                    src={`/storage/${reply.user.profile.profile_picture_path}`}
                                                                    alt={reply.user.name}
                                                                    className="h-full w-full rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-medium text-gray-600">
                                                                    {reply.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            {editingCommentId === reply.id ? (
                                                                <form onSubmit={(e) => handleUpdateComment(e, reply.id)} className="space-y-2">
                                                                    <Textarea
                                                                        value={editCommentContent}
                                                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                                                        className="min-h-[60px] resize-none"
                                                                    />
                                                                    <div className="flex items-center gap-2">
                                                                        <Button type="submit" size="sm" disabled={isUpdatingComment || !editCommentContent.trim()}>
                                                                            {isUpdatingComment ? '...' : 'Enregistrer'}
                                                                        </Button>
                                                                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                                                                            Annuler
                                                                        </Button>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <>
                                                                    <div className="bg-muted rounded-lg p-2">
                                                                        <h5 className="text-foreground text-xs font-medium">{reply.user?.name || 'Unknown User'}</h5>
                                                                        <p className="text-foreground mt-1 text-xs">{reply.content}</p>
                                                                    </div>
<div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                                                                        <span>{formatTimeAgo(reply.created_at)}</span>
                                                                        {auth.user.id === reply.user_id && (
                                                                            <>
                                                                                <button 
                                                                                    className="hover:text-foreground"
                                                                                    onClick={() => handleEditComment(reply)}
                                                                                >
                                                                                    Modifier
                                                                                </button>
                                                                                <button 
                                                                                    className="hover:text-destructive"
                                                                                    onClick={() => setCommentToDelete(reply.id)}
                                                                                >
                                                                                    Supprimer
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {auth.user.id !== reply.user_id && isMatchmaker && reply.user?.roles?.[0]?.name === 'user' && (
                                                                            <button 
                                                                                className="hover:text-destructive"
                                                                                onClick={() => setCommentToDelete(reply.id)}
                                                                            >
                                                                                Supprimer
                                                                            </button>
                                                                        )}
                                                                        </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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

            {/* Comments Modal */}
            <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
                <DialogContent className="max-h-[85vh] max-w-md overflow-hidden rounded-xl border border-border bg-background p-0 shadow-lg">
                    <DialogHeader className="border-border flex flex-row items-center justify-between space-y-0 border-b px-5 py-4">
                        <DialogTitle className="text-red-600 text-lg font-semibold uppercase tracking-wide">Comments</DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 -mr-2 h-8 w-8 shrink-0 rounded-full"
                            onClick={() => setShowCommentsModal(false)}
                            aria-label="Fermer"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
                        {!(comments && comments.length > 0) ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="bg-red-50 text-red-600 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                                    <MessageCircle className="h-8 w-8" />
                                </div>
                                <p className="text-muted-foreground mb-1 text-sm italic">No comments yet.</p>
                                <p className="text-muted-foreground text-sm">Be the first to start the discussion!</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {comments.map((comment) => (
                                    <li key={comment.id} className="space-y-2">
                                        <div className="flex items-start gap-3">
                                            <Link
                                                href={`/profile/${comment.user?.username || comment.user?.id}`}
                                                onClick={() => setShowCommentsModal(false)}
                                                className="shrink-0"
                                            >
                                                <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-red-500 bg-muted">
                                                    {getCommenterAvatarUrl(comment.user) ? (
                                                        <img
                                                            src={getCommenterAvatarUrl(comment.user)}
                                                            alt={comment.user?.name || ''}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-muted-foreground flex h-full w-full items-center justify-center text-xs font-medium">
                                                            {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/profile/${comment.user?.username || comment.user?.id}`}
                                                    onClick={() => setShowCommentsModal(false)}
                                                    className="text-foreground hover:underline text-sm font-medium"
                                                >
                                                    {comment.user?.name || 'Utilisateur'}
                                                </Link>
                                                <p className="text-foreground mt-0.5 text-sm">{comment.content}</p>
                                                <span className="text-muted-foreground text-xs">{formatTimeAgoLong(comment.created_at)}</span>
                                            </div>
                                        </div>
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="ml-11 space-y-2 border-l-2 border-red-200 pl-3">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex items-start gap-2">
                                                        <Link
                                                            href={`/profile/${reply.user?.username || reply.user?.id}`}
                                                            onClick={() => setShowCommentsModal(false)}
                                                            className="shrink-0"
                                                        >
                                                            <div className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-red-500 bg-muted">
                                                                {getCommenterAvatarUrl(reply.user) ? (
                                                                    <img
                                                                        src={getCommenterAvatarUrl(reply.user)}
                                                                        alt={reply.user?.name || ''}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="text-muted-foreground flex h-full w-full items-center justify-center text-xs font-medium">
                                                                        {reply.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </Link>
                                                        <div className="min-w-0 flex-1">
                                                            <Link
                                                                href={`/profile/${reply.user?.username || reply.user?.id}`}
                                                                onClick={() => setShowCommentsModal(false)}
                                                                className="text-foreground hover:underline text-sm font-medium"
                                                            >
                                                                {reply.user?.name || 'Utilisateur'}
                                                            </Link>
                                                            <p className="text-foreground mt-0.5 text-sm">{reply.content}</p>
                                                            <span className="text-muted-foreground text-xs">{formatTimeAgoLong(reply.created_at)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Liked by Modal */}
            <Dialog open={showLikersModal} onOpenChange={setShowLikersModal}>
                <DialogContent className="max-h-[85vh] max-w-md overflow-hidden rounded-xl border border-border bg-background p-0 shadow-lg">
                    <DialogHeader className="border-border space-y-1 border-b px-5 py-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <DialogTitle className="text-foreground text-lg font-semibold">Liked by</DialogTitle>
                                <DialogDescription className="text-muted-foreground mt-0.5 text-sm">
                                    {likers.length} {likers.length === 1 ? 'personne' : 'personnes'}
                                </DialogDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground -mr-2 -mt-1 h-8 w-8 shrink-0 rounded-full"
                                onClick={() => setShowLikersModal(false)}
                                aria-label="Fermer"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
                        {likers.length === 0 ? (
                            <p className="text-muted-foreground py-6 text-center text-sm">Aucun like pour le moment.</p>
                        ) : (
                            <ul className="space-y-2">
                                {likers.map((like) => {
                                    const user = like.user;
                                    const profileUrl = `/profile/${user?.username || user?.id}`;
                                    const avatarUrl = getLikerAvatarUrl(like);
                                    return (
                                        <li key={like.id}>
                                            <Link
                                                href={profileUrl}
                                                className="bg-muted/60 hover:bg-muted flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 transition-colors"
                                                onClick={() => setShowLikersModal(false)}
                                            >
                                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-red-500 bg-muted">
                                                    {avatarUrl ? (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={user?.name || ''}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-muted-foreground flex h-full w-full items-center justify-center text-sm font-medium">
                                                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-foreground truncate font-medium">{user?.name || 'Utilisateur'}</span>
                                                </div>
                                                <span className="text-muted-foreground shrink-0 text-xs">
                                                    {formatTimeAgoLong(like.created_at)}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Post Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Êtes-vous sûr ?</DialogTitle>
                        <DialogDescription>Cette action est irréversible. Cela supprimera définitivement votre publication.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Comment Confirmation Dialog */}
            <Dialog open={commentToDelete !== null} onOpenChange={(open) => !open && setCommentToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Êtes-vous sûr ?</DialogTitle>
                        <DialogDescription>Cette action est irréversible. Cela supprimera définitivement votre commentaire.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCommentToDelete(null)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={() => handleDeleteComment(commentToDelete)}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
