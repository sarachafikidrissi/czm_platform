import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell } from 'lucide-react';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const handleBack = () => {
        window.history.back();
    };
    const { props } = usePage();
    const notifications = (props as any)?.notifications;
    const totalNotifications = notifications?.propositionRequests?.total || 0;
    const notificationItems = notifications?.propositionRequests?.items || [];

    const getAvatarSrc = (item: any) => {
        const profilePath = item?.compatible_user?.profile_picture_path || item?.reference_user?.profile_picture_path;
        const name = item?.compatible_user?.name || item?.reference_user?.name || 'User';
        if (profilePath) {
            return `/storage/${profilePath}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    };

    const getNotificationText = (item: any) => {
        const refName = item?.reference_user?.name || 'Profil A';
        const compName = item?.compatible_user?.name || 'Profil B';
        if (item?.type === 'received') {
            return `Demande reçue: ${refName} & ${compName}`;
        }
        return `Réponse envoyée: ${refName} & ${compName}`;
    };

    const getStatusLabel = (status: string) => {
        if (status === 'pending') return 'En attente';
        if (status === 'accepted') return 'Acceptée';
        if (status === 'rejected') return 'Refusée';
        return status || '—';
    };

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-9 w-9"
                    title="Go back"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative h-9 w-9"
                        >
                            <Bell className="h-5 w-5" />
                            <span className="sr-only">Notifications</span>
                            {totalNotifications > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                                    {totalNotifications}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-100">
                        <div className="px-3 py-2 text-xl text-green-800 font-bold text-center">Notifications</div>
                        <div className="h-80 max-h-100 overflow-auto">
                            {notificationItems.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-muted-foreground">Aucune notification.</div>
                            ) : (
                                notificationItems.map((item: any) => (
                                    <Link
                                        key={item.id}
                                        href={`/staff/matchmaker/proposition-requests?type=${item.type}`}
                                        className="flex items-start gap-3 px-3  hover:bg-muted/50 border-b-2 py-5"
                                    >
                                        <img
                                            src={getAvatarSrc(item)}
                                            alt="avatar"
                                            className="h-8 w-8 rounded-full object-cover"
                                        />
                                        <div className="min-w-0 text-sm">
                                            <div className="font-medium truncate">{getNotificationText(item)}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {getStatusLabel(item.status)}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <LanguageSwitcher />
            </div>
        </header>
    );
}
