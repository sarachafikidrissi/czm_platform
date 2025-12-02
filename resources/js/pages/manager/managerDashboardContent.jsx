import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Crown, UserPlus } from 'lucide-react';
import CreatePost from '@/components/posts/CreatePost';
import PostCard from '@/components/posts/PostCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManagerDashboardContent({ stats = { prospectsReceived: 0, activeClients: 0, members: 0 }, posts = null }) {
    const isLoading = stats === null || stats === undefined;
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Tableau de bord Manager</h1>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prospects reçus</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-40" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.prospectsReceived || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Prospects dans votre agence
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clients actifs</CardTitle>
                        <Crown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.activeClients || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Clients actifs
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Membres</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.members || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Membres actifs
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Actions rapides</CardTitle>
                        <CardDescription>
                            Actions fréquemment utilisées
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/staff/prospects/create">
                            <Button className="w-full sm:w-auto">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Ajouter prospect
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Agency Posts Section */}
            <div className="grid gap-6 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Posts de l'agence</CardTitle>
                        <CardDescription>
                            Créez et gérez les posts de votre agence
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Create Post Form */}
                        <CreatePost />

                        {/* Posts Feed */}
                        {posts === null || posts === undefined ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="space-y-3">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : posts && posts.data && posts.data.length > 0 ? (
                            <div className="space-y-4">
                                {posts.data.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Aucun post pour le moment. Créez votre premier post ci-dessus.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
