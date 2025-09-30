import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-2 text-white ">
            {/* <SidebarGroupLabel >CZM Platform</SidebarGroupLabel> */}
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={item.url === page.url}>
                            <Link href={item.url} prefetch className=' h-10'>
                                {item.icon && <item.icon  />}
                                <span className={`text-[18px]`}>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        {item.children && item.children.length > 0 && (
                            <SidebarMenuSub>
                                {item.children.map((sub) => (
                                    <SidebarMenuSubItem key={sub.title}>
                                        <SidebarMenuSubButton asChild isActive={sub.url === page.url}>
                                            <Link href={sub.url} prefetch>
                                                <span>{sub.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
