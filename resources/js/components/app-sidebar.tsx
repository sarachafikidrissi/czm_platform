import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { CalendarHeart, Flame, HeartHandshake, Images, LayoutGrid, User, UserRoundSearch, Users, UserCheck, Plus, ShoppingCart, CreditCard, RotateCcw, Building2, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getMainNavItems = (t: (key: string) => string, role: string): NavItem[] => [
    {
        title: t('common.dashboard'),
        url: '/dashboard',
        icon: LayoutGrid,
        roles: ['user', 'admin', 'matchmaker', 'manager'],
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
        roles: ['matchmaker'],
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
        title: t('navigation.assignmentTracking'),
        url: '/manager/tracking',
        icon: UserRoundSearch,
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
        roles: ['matchmaker'],
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
        let updatedItem = { ...item };
        
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
        <Sidebar collapsible="icon" variant="inset" side={sidebarSide} className="bg-[#890505]">
            <SidebarHeader>
                <SidebarMenu className="">
                    <SidebarMenuItem>
                        <SidebarMenuButton className="hover:bg-transparent" size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                {/* to be changed when user upload his picture */}
                                <div className="flex w-full items-center justify-between gap-x-1">
                                    <img src="/images/Czm-white-logo.png" alt="profile-picture" className="size-10 fill-current object-cover" />
                                    <span className="text-white">{t('common.centreZawajMaroc')}</span>
                                </div>
                                <div className="ml-1 grid flex-1 text-left text-sm">
                                    <span className="mb-0.5 truncate leading-none font-semibold">{}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="">
                <NavMain items={navitems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
