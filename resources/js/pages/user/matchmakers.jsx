import { Head, router, usePage, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { HeartHandshake, CheckCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PostCard from '@/components/posts/PostCard';
import { useState } from 'react';

export default function UserMatchmakers() {
    const { posts, assignedMatchmaker } = usePage().props;
    const [selected, setSelected] = useState(null);
    

    const handleSelectMatchmaker = (matchmakerId) => {
        router.post(`/user/matchmakers/${matchmakerId}/select`);
    };

    const handlePageChange = (page) => {
        router.get(`/user/matchmakers?page=${page}`, {}, {
            preserveState: true,
            preserveScroll: true
        });
    };

    return (
        <AppLayout>
            <Head title="Choose Matchmaker" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Matchmaker Posts</h1>
                    {assignedMatchmaker && (
                        <Badge className="bg-success-bg text-success">
                            Assigned to: {assignedMatchmaker.name}
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground">
                    Discover matchmakers through their latest posts and activities
                </p>
            </div>

            {/* {assignedMatchmaker && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            Your Assigned Matchmaker
                        </CardTitle>
                        <CardDescription>
                            You have been assigned to a matchmaker
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{assignedMatchmaker.name}</h3>
                                <p className="text-sm text-gray-600">{assignedMatchmaker.email}</p>
                                <p className="text-sm text-gray-600">Agency: {assignedMatchmaker.agency}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )} */}

            {/* Posts Display */}
            <div className="space-y-4">
                {posts.data && posts.data.length > 0 ? (
                    posts.data.map((post) => (
                        <div key={post.id} className="relative w-[65%] max-md:w-[100%] max-sm:w-[100%]">
                            <PostCard  post={post} />
                            <div className="absolute top-4 right-4">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" onClick={() => setSelected(post.user)}>
                                            View Profile
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[480px]">
                                        <DialogHeader>
                                            <DialogTitle>Matchmaker Details</DialogTitle>
                                            <DialogDescription>Information about the selected matchmaker.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-3 py-2">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Name</div>
                                                <div className="font-medium">{selected?.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Email</div>
                                                <div className="font-medium">{selected?.email}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Agency</div>
                                                <div className="font-medium">{selected?.agency?.name ?? '—'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Joined</div>
                                                <div className="font-medium">{selected?.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-4 space-x-2">
                                            <Link href={`/profile/${selected?.username || selected?.id}`}>
                                                <Button size="sm" className="bg-info hover:opacity-90">
                                                    View Full Profile
                                                </Button>
                                            </Link>
                                            {assignedMatchmaker && assignedMatchmaker.id === selected?.id ? (
                                                <Button size="sm" variant="outline" disabled>
                                                    Selected
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSelectMatchmaker(selected?.id)}
                                                >
                                                    <HeartHandshake className="w-4 h-4 mr-2" />
                                                    Select
                                                </Button>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    ))
                ) : (
                    <Card>
                        <CardContent className="text-center py-8">
                            <HeartHandshake className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No posts from matchmakers available at the moment.</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Pagination */}
            {posts.data && posts.data.length > 0 && posts.last_page > 1 && (
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {posts.from} to {posts.to} of {posts.total} posts
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(posts.current_page - 1)}
                                    disabled={posts.current_page <= 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Button>
                                
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, posts.last_page) }, (_, i) => {
                                        let pageNum;
                                        if (posts.last_page <= 5) {
                                            pageNum = i + 1;
                                        } else if (posts.current_page <= 3) {
                                            pageNum = i + 1;
                                        } else if (posts.current_page >= posts.last_page - 2) {
                                            pageNum = posts.last_page - 4 + i;
                                        } else {
                                            pageNum = posts.current_page - 2 + i;
                                        }
                                        
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={posts.current_page === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => handlePageChange(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(posts.current_page + 1)}
                                    disabled={posts.current_page >= posts.last_page}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
            </div>
        </AppLayout>
    );
}
