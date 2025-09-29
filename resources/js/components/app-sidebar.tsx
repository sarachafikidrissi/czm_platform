import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { CalendarHeart, Flame, HeartHandshake, Images, LayoutGrid, User, UserRoundSearch } from 'lucide-react';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
        roles: ['user', 'admin', 'matchmaker'],
    },
    {
        title: 'Prospects',
        url: '/prospects',
        icon: UserRoundSearch,
        roles: ['user', 'admin', 'matchmaker'],
    },
    {
        title: 'Mon Profil',
        url: '/profile-info',
        icon: User,
        roles: ['user'],
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
        roles: ['user'],
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
    const navitems = filterNavItemsByRole(mainNavItems, role);

    
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
