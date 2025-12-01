import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    
    // Initialize openItems - auto-open if current page matches any child URL
    const getInitialOpenItems = () => {
        const open: Record<string, boolean> = {};
        items.forEach(item => {
            if (item.children && item.children.length > 0) {
                const childMatches = item.children.some(child => {
                    const currentPath = page.url.split('?')[0];
                    const childPath = child.url.split('?')[0];
                    return currentPath === childPath;
                });
                if (childMatches) {
                    open[item.title] = true;
                }
            }
        });
        return open;
    };
    
    const [openItems, setOpenItems] = useState<Record<string, boolean>>(getInitialOpenItems());

    const toggleOpen = (title: string) => {
        setOpenItems((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <SidebarGroup className="px-2 py-2 text-white ">
            {/* <SidebarGroupLabel >CZM Platform</SidebarGroupLabel> */}
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        {item.children && item.children.length > 0 ? (
                            <>
                                {(() => {
                                    // Check if any child URL matches the current page
                                    const childMatches = item.children?.some(child => {
                                        const currentPath = page.url.split('?')[0];
                                        const childPath = child.url.split('?')[0];
                                        return currentPath === childPath;
                                    }) || false;
                                    const isParentActive = item.url === page.url || childMatches;
                                    return (
                                        <SidebarMenuButton asChild isActive={openItems[item.title] || isParentActive} onClick={() => toggleOpen(item.title)}>
                                            <button className='h-10 w-full flex items-center gap-2 justify-between'>
                                                <span className='flex items-center gap-2'>
                                                    {item.icon && <item.icon />}
                                                    <span className={`text-[18px]`}>{item.title}</span>
                                                </span>
                                                <span className='shrink-0'>
                                                    {openItems[item.title] ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>}
                                                </span>
                                            </button>
                                        </SidebarMenuButton>
                                    );
                                })()}
                                {openItems[item.title] && (
                                    <SidebarMenuSub>
                                        {item.children.map((sub) => {
                                            // Check if the current URL matches the sub URL (including query params)
                                            const currentPath = page.url.split('?')[0];
                                            const subPath = sub.url.split('?')[0];
                                            const currentParams = new URLSearchParams(page.url.split('?')[1] || '');
                                            const subParams = new URLSearchParams(sub.url.split('?')[1] || '');
                                            
                                            // Check if path matches and query params match
                                            const pathMatches = currentPath === subPath;
                                            let paramsMatch = true;
                                            subParams.forEach((value, key) => {
                                                if (currentParams.get(key) !== value) {
                                                    paramsMatch = false;
                                                }
                                            });
                                            
                                            const isActive = pathMatches && paramsMatch;
                                            return (
                                                <SidebarMenuSubItem key={sub.title}>
                                                    <SidebarMenuSubButton asChild isActive={isActive}>
                                                        <Link href={sub.url} prefetch>
                                                            <span>{sub.title}</span>
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            );
                                        })}
                                    </SidebarMenuSub>
                                )}
                            </>
                        ) : (
                            <SidebarMenuButton asChild isActive={item.url === page.url}>
                                <Link href={item.url} prefetch className=' h-10'>
                                    {item.icon && <item.icon  />}
                                    <span className={`text-[18px]`}>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
