import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { CalendarHeart, Flame, HeartHandshake, Images, LayoutGrid, User, UserRoundSearch, Users, UserCheck, Plus, ShoppingCart } from 'lucide-react';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
        roles: ['user', 'admin', 'matchmaker', 'manager'],
    },
    {
        title: 'Mon Profil',
        url: '/profile-info',
        icon: User,
        roles: ['user'],
    },
    {
        title: 'Mon Profile',
        url: '/user/profile/{username}',
        icon: User,
        roles: ['matchmaker'],
    },
    {
        title: 'Mon Photos',
        url: '/photos',
        icon: Images,
        roles: ['user'],
    },
    {
        title: 'Mon Matchmaker',
        url: '/matchmaker',
        icon: HeartHandshake,
        roles: ['user'],
    },
    {
        title: 'Propositions',
        url: '/propositions',
        icon: Flame,
        roles: ['user'],
    },
    {
        title: 'Mes Rendez-vous',
        url: '/appointments',
        icon: CalendarHeart,
        roles: ['user', 'admin'],
    },
    {
        title: 'Mes Commandes',
        url: '/mes-commandes',
        icon: ShoppingCart,
        roles: ['user'],
    },
    {
        title: 'Manage Staff',
        url: '/admin/dashboard?view=managers',
        icon: Users,
        roles: ['admin'],
        children: [
            { title: 'Manage Managers', url: '/admin/dashboard?view=managers', roles: ['admin'] },
            { title: 'Manage Matchmakers', url: '/admin/dashboard?view=matchmakers', roles: ['admin'] },
        ],
    },
    {
        title: 'Prospects',
        url: '/admin/prospects',
        icon: UserCheck,
        roles: ['admin'],
    },
    {
        title: 'Prospects',
        url: '/staff/agency-prospects',
        icon: UserCheck,
        roles: ['matchmaker', 'manager'],
    },
    {
        title: 'Choose Matchmaker',
        url: '/user/matchmakers',
        icon: HeartHandshake,
        roles: ['user'],
    },
    {
        title: 'Members/Client',
        url: '/staff/validated-prospects',
        icon: HeartHandshake,
        roles: ['admin', 'matchmaker', 'manager'],
    },
];

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     url: 'https://github.com/laravel/react-starter-kit',
    //     icon: Folder,
    // },
    // {
    //     title: 'Documentation',
    //     url: 'https://laravel.com/docs/starter-kits',
    //     icon: BookOpen,
    // },
];


const filterNavItemsByRole = (navItems: NavItem[], userRole: string): NavItem[] => {
    return navItems.filter(item => item.roles.includes(userRole));
  };

export function AppSidebar() {
    const { props } = usePage();
    const role = typeof props?.role === 'string' ? props.role : '';
    const user = (props as any)?.auth?.user;
    
    // Process nav items to handle dynamic URLs
    const processedNavItems = mainNavItems.map(item => {
        if (item.url === '/user/profile/{username}' && user?.username) {
            return {
                ...item,
                url: `/profile/${user.username}`
            };
        }
        return item;
    });
    
    const navitems = filterNavItemsByRole(processedNavItems, role);

    
    return (
        // sidebar container
        <Sidebar collapsible="icon" variant="inset" className="bg-[#722323]">
            <SidebarHeader>
                <SidebarMenu className="">
                    <SidebarMenuItem>
                        <SidebarMenuButton className="hover:bg-transparent" size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                {/* to be changed when user upload his picture */}
                                <div className="flex w-full items-center justify-between gap-x-1">
                                    <img src="/images/Czm-white-logo.png" alt="profile-picture" className="size-10 fill-current object-cover" />
                                    <span className="text-white">Centre Zawaj Maroc</span>
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
