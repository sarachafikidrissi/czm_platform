import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { ChevronDown, ChevronRight, Moon } from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import { GlobalSearch } from '@/components/global-search';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { CalendarHeart, Flame, HeartHandshake, Images, LayoutGrid, User, UserRoundSearch, Users, UserCheck, Plus, ShoppingCart, CreditCard, RotateCcw, Building2, Target, ArrowRightLeft, List, Search, UserCog, Newspaper, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const getMainNavItems = (t: TFunction, role: string): NavItem[] => [
    {
        title: t('common.dashboard'),
        url: '/dashboard',
        icon: LayoutGrid,
        roles: ['user', 'admin', 'matchmaker', 'manager'],
    },
    {
        title: t('navigation.newsFeed', { defaultValue: 'Fil d\'actualité' }),
        url: '/staff/news-feed',
        icon: Newspaper,
        roles: ['admin', 'matchmaker', 'manager'],
    },
    {
        title: t('navigation.myProfile'),
        url: '/profile-info',
        icon: User,
        roles: ['user'],
    },
    {
        title: t('navigation.myProfile'),
        url: '/user/profile/{username}',
        icon: User,
        roles: ['matchmaker', 'manager'],
    },
    {
        title: t('navigation.myPhotos'),
        url: '/photos',
        icon: Images,
        roles: ['user', 'matchmaker', 'manager', 'admin'],
    },
    {
        title: t('navigation.myMatchmaker'),
        url: '/matchmaker',
        icon: HeartHandshake,
        roles: ['user'],
    },
    {
        title: t('navigation.propositions'),
        url: '/propositions',
        icon: Flame,
        roles: ['user'],
    },
    {
        title: t('navigation.myAppointments'),
        url: '/appointments',
        icon: CalendarHeart,
        roles: ['user', 'admin'],
    },
    {
        title: t('navigation.myOrders'),
        url: '/mes-commandes',
        icon: ShoppingCart,
        roles: ['user'],
    },
    {
        title: t('navigation.mySubscription'),
        url: '/user/subscription',
        icon: CreditCard,
        roles: ['user'],
    },
    {
        title: t('navigation.manageStaff'),
        url: '/admin/dashboard?view=managers',
        icon: Users,
        roles: ['admin'],
        children: [
            { title: t('navigation.manageManagers'), url: '/admin/dashboard?view=managers', roles: ['admin'] },
            { title: t('navigation.manageMatchmakers'), url: '/admin/dashboard?view=matchmakers', roles: ['admin'] },
        ],
    },
    {
        title: t('navigation.manageAgencies'),
        url: '/admin/agencies',
        icon: Building2,
        roles: ['admin'],
    },
    {
        title: t('navigation.prospects'),
        url: '/admin/prospects',
        icon: UserCheck,
        roles: ['admin'],
    },
    {
        title: t('navigation.appointmentRequests', { defaultValue: 'Appointment Requests' }),
        url: '/admin/appointment-requests',
        icon: Calendar,
        roles: ['admin'],
    },
    {
        title: t('navigation.prospects'),
        url: '/staff/agency-prospects',
        icon: UserCheck,
        roles: ['matchmaker', 'manager'],
    },
    {
        title: t('navigation.addProspect'),
        url: '/staff/prospects/create',
        icon: Plus,
        roles: ['matchmaker', 'manager'],
    },
    {
        title: t('navigation.appointmentRequests', { defaultValue: 'Appointment Requests' }),
        url: '/staff/appointment-requests',
        icon: Calendar,
        roles: ['matchmaker'],
    },
    {
        title: t('navigation.assignmentTracking'),
        url: '/manager/tracking',
        icon: UserRoundSearch,
        roles: ['manager'],
    },
    {
        title: t('navigation.dispatchProspects'),
        url: '/manager/prospects-dispatch',
        icon: UserCheck,
        roles: ['manager'],
    },
    {
        title: t('navigation.appointmentRequests', { defaultValue: 'Appointment Requests' }),
        url: '/manager/appointment-requests',
        icon: Calendar,
        roles: ['manager'],
    },
    {
        title: t('navigation.chooseMatchmaker'),
        url: '/user/matchmakers',
        icon: HeartHandshake,
        roles: ['user'],
    },
    {
        title: t('navigation.membersClient'),
        url: '/staff/validated-prospects',
        icon: HeartHandshake,
        roles: ['admin', 'matchmaker', 'manager'],
    },
    {
        title: t('navigation.evaluatedUsers', { defaultValue: 'Evaluated Users' }),
        url: '/staff/evaluated-users',
        icon: UserCheck,
        roles: ['admin', 'matchmaker', 'manager'],
    },
    {
        title: t('navigation.monthlyObjectives'),
        url: '/objectives',
        icon: Target,
        roles: ['admin', 'matchmaker', 'manager'],
    },
    {
        title: t('navigation.reactivationRequests'),
        url: '/admin/reactivation-requests',
        icon: RotateCcw,
        roles: ['admin'],
    },
    {
        title: t('navigation.reactivationRequests'),
        url: '/staff/reactivation-requests',
        icon: RotateCcw,
        roles: ['matchmaker', 'manager'],
    },
    {
        title: t('navigation.transferRequests', { defaultValue: 'Transfer Requests' }),
        url: '/staff/transfer-requests?type=received',
        icon: ArrowRightLeft,
        roles: ['matchmaker', 'manager'],
        children: [
            { title: t('navigation.receivedRequests', { defaultValue: 'Demandes reçues' }), url: '/staff/transfer-requests?type=received', roles: ['matchmaker', 'manager'] },
            { title: t('navigation.sentRequests', { defaultValue: 'Demandes envoyées' }), url: '/staff/transfer-requests?type=sent', roles: ['matchmaker', 'manager'] },
        ],
    },
    {
        title: t('navigation.matchmaker', { defaultValue: 'Matchmaker' }),
        url: '/staff/matchmaker/propositions',
        icon: UserCog,
        roles: ['matchmaker', 'manager'],
        children: [
            { title: t('navigation.propositionsList', { defaultValue: 'Liste des propositions' }), url: '/staff/matchmaker/propositions', roles: ['matchmaker', 'manager'] },
            { title: t('navigation.matchmakerChange', { defaultValue: 'Changement matchmaker' }), url: '/staff/matchmaker/change', roles: ['matchmaker', 'manager'] },
        ],
    },
    {
        title: t('navigation.propositionRequests', { defaultValue: 'Demande de propositions' }),
        url: '/staff/matchmaker/proposition-requests?type=received',
        icon: UserCheck,
        roles: ['matchmaker'],
        children: [
            { title: t('navigation.receivedRequests', { defaultValue: 'Demandes reçues' }), url: '/staff/matchmaker/proposition-requests?type=received', roles: ['matchmaker'] },
            { title: t('navigation.sentRequests', { defaultValue: 'Demandes envoyées' }), url: '/staff/matchmaker/proposition-requests?type=sent', roles: ['matchmaker'] },
        ],
    },
    {
        title: t('navigation.match', { defaultValue: 'Match' }),
        url: '/staff/match/list',
        icon: HeartHandshake,
        roles: ['matchmaker', 'manager'],
        children: [
            { title: t('navigation.matchList', { defaultValue: 'Liste des Match' }), url: '/staff/match/list', roles: ['matchmaker', 'manager'] },
            { title: t('navigation.searchMatchProfiles', { defaultValue: 'Rechercher Profils Match' }), url: '/staff/match/search', roles: ['matchmaker', 'manager'] },
        ],
    },
    {
        title: t('navigation.agencies'),
        url: '/agencies',
        icon: Building2,
        roles: ['user', 'admin', 'matchmaker', 'manager'],
    },
];

const footerNavItems: NavItem[] = [];

const filterNavItemsByRole = (navItems: NavItem[], userRole: string): NavItem[] => {
    return navItems.filter(item => item.roles.includes(userRole));
};

export function AppSidebar() {
    const { props } = usePage();
    const role = typeof props?.role === 'string' ? props.role : '';
    const user = (props as any)?.auth?.user;
    const { t, i18n } = useTranslation();
    
    // Get navigation items with translations
    const mainNavItems = getMainNavItems(t, role);
    
    // Process nav items to handle dynamic URLs and conditional titles
    const processedNavItems = mainNavItems.map(item => {
        const updatedItem = { ...item };
        
        // Handle dynamic profile URL
        if (item.url === '/user/profile/{username}' && user?.username) {
            updatedItem.url = `/profile/${user.username}`;
        }
        
        // Handle Photos title based on role
        if (item.url === '/photos' && role !== 'user') {
            updatedItem.title = t('common.clientsPhotos');
        }
        
        return updatedItem;
    });
    
    const navitems = filterNavItemsByRole(processedNavItems, role);
    
    // Determine sidebar side based on language (RTL for Arabic)
    const sidebarSide = i18n.language === 'ar' ? 'right' : 'left';

    
    return (
        // sidebar container
        <Sidebar collapsible="icon" variant="inset" side={sidebarSide} className="bg-[#890505] text-white">
            <SidebarHeader className="pt-4">
                <SidebarMenu className="">
                    <SidebarMenuItem>
                        <SidebarMenuButton className="hover:bg-white/10 rounded-2xl" size="lg" asChild tooltip={t('common.centreZawajMaroc')}>
                            <Link href="/dashboard" prefetch>
                                <div className="flex w-full items-center gap-3 px-1">
                                    <div className="h-10 w-10 rounded-full bg-white p-1 shadow-sm">
                                        <img src="/images/czm_Logo.png" alt="CZM logo" className="h-full w-full object-contain" />
                                    </div>
                                    <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="text-sm font-semibold uppercase tracking-wide">{t('common.centreZawajMaroc')}</span>
                                        <span className="text-xs uppercase tracking-[0.28em] text-white/70">Maroc Agency</span>
                                    </div>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-3 pb-2 group-data-[collapsible=icon]:overflow-auto">
                <GlobalSearch role={role} />
                <NavMain items={navitems} />
            </SidebarContent>

            <SidebarFooter className="gap-3 pb-3">
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
               
            </SidebarFooter>
        </Sidebar>
    );
}
