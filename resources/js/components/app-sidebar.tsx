import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, User, HeartHandshake, CalendarHeart, Images, Flame } from 'lucide-react';
import { userInfo } from 'os';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
        
    },
    {
        title: 'Mon Profil',
        url: '',
        icon: User
    },
    {
        title: 'Mon Photos',
        url: '',
        icon: Images
    },
    {
        title: 'Mon Matchmaker',
        url: '',
        icon: HeartHandshake
    },
    {
        title: 'Propositions',
        url: '',
        icon: Flame
    },
    {
        title: 'Mes Rendez-vous',
        url: '',
        icon: CalendarHeart
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

export function AppSidebar() {
    return (
        // sidebar container
        <Sidebar collapsible="icon" variant="inset" className='bg-[#722323]' >
            <SidebarHeader>
                <SidebarMenu className=''>
                    <SidebarMenuItem>
                        <SidebarMenuButton className='hover:bg-transparent' size="lg" asChild >
                            <Link href="/dashboard" prefetch>
                                {/* to be changed when user upload his picture */}
                                <div className="flex justify-between items-center gap-x-1 w-full">
                                    <img
                                        src="/images/Czm-white-logo.png"
                                        alt="profile-picture"
                                        className="size-10 fill-current object-cover"
                                    />
                                    <span className='text-white'>Centre Zawaj Maroc</span>
                                </div>
                                <div className="ml-1 grid flex-1 text-left text-sm">
                                    <span className="mb-0.5 truncate leading-none font-semibold">{}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className=''>
                <NavMain  items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter  items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
