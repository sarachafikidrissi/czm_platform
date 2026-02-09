import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Fragment, useState } from 'react';

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

    const clientSectionUrls = new Set([
        '/admin/prospects',
        '/staff/agency-prospects',
        '/manager/tracking',
    ]);
    let hasRenderedClientLabel = false;

    return (
        <SidebarGroup className="px-2 py-2 text-white">
            {/* <SidebarGroupLabel >CZM Platform</SidebarGroupLabel> */}
            <SidebarMenu className="gap-2">
                {items.map((item) => {
                    const shouldRenderClientLabel = !hasRenderedClientLabel && clientSectionUrls.has(item.url);
                    if (shouldRenderClientLabel) {
                        hasRenderedClientLabel = true;
                    }

                    return (
                        <Fragment key={item.title}>
                            {shouldRenderClientLabel && (
                                <li className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 group-data-[collapsible=icon]:hidden">
                                    Gestion Clients
                                </li>
                            )}
                            <SidebarMenuItem>
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
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={openItems[item.title] || isParentActive}
                                                    onClick={() => toggleOpen(item.title)}
                                                    className="h-11 rounded-2xl px-3 text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
                                                    tooltip={item.title}
                                                >
                                                    <button className="flex h-11 w-full items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
                                                        <span className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                                                            {item.icon && <item.icon className="h-5 w-5" />}
                                                            <span className="text-[15px] group-data-[collapsible=icon]:hidden">{item.title}</span>
                                                        </span>
                                                        <span className="shrink-0 text-white/80 group-data-[collapsible=icon]:hidden">
                                                            {openItems[item.title] ? (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                                </svg>
                                                            ) : (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                                </svg>
                                                            )}
                                                        </span>
                                                    </button>
                                                </SidebarMenuButton>
                                            );
                                        })()}
                                        {openItems[item.title] && (
                                            <SidebarMenuSub className="border-white/15 ml-6 border-l pl-3">
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
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={isActive}
                                                                className="h-9 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white"
                                                            >
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
                                    <SidebarMenuButton
                                        asChild
                                        isActive={item.url === page.url}
                                        className="h-11 rounded-2xl px-3 text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white"
                                        tooltip={item.title}
                                    >
                                        <Link href={item.url} prefetch className="flex h-11 items-center gap-3 group-data-[collapsible=icon]:justify-center">
                                            {item.icon && <item.icon className="h-5 w-5" />}
                                            <span className="text-[15px] group-data-[collapsible=icon]:hidden">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                )}
                            </SidebarMenuItem>
                        </Fragment>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
