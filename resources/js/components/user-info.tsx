import { AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { Avatar, AvatarImage } from '@radix-ui/react-avatar';

export function UserInfo({
    user,
    showEmail = false,
    statusText,
}: {
    user: User;
    showEmail?: boolean;
    statusText?: string;
}) {
    const getInitials = useInitials();
    const showStatus = Boolean(statusText);

    return (
        <>
            {/* <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar> */}
            <div className="relative h-9 w-9 overflow-hidden rounded-full">
                {(() => {
                    const userRole = user?.roles?.[0]?.name || 'user';
                    let profilePictureSrc = null;
                    
                    if (userRole === 'user' && user?.profile?.profile_picture_path) {
                        profilePictureSrc = `/storage/${user.profile.profile_picture_path}`;
                    } else if (userRole !== 'user' && user?.profile_picture) {
                        profilePictureSrc = `/storage/${user.profile_picture}`;
                    }
                    
                    return profilePictureSrc ? (
                        <img src={profilePictureSrc} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                        <Avatar className="h-9 w-9 overflow-hidden rounded-full">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                    );
                })()}
                {showStatus && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#890505] bg-emerald-400" />
                )}
            </div>

            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[15px] font-medium text-white">{user.name}</span>
                {statusText && <span className="text-[12px] text-white/70">{statusText}</span>}
                {showEmail && <span className="text-muted-foreground truncate text-xs">{user.email}</span>}
            </div>
        </>
    );
}
