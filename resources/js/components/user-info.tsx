import { AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { Avatar, AvatarImage } from '@radix-ui/react-avatar';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();

    return (
        <>
            {/* <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar> */}
            <div className="h-8 w-8 overflow-hidden rounded-full">
                {(() => {
                    const userRole = user?.roles?.[0]?.name || 'user';
                    let profilePictureSrc = null;
                    
                    if (userRole === 'user' && user?.profile?.profile_picture_path) {
                        profilePictureSrc = `/storage/${user.profile.profile_picture_path}`;
                    } else if (userRole !== 'user' && user?.profile_picture) {
                        profilePictureSrc = `/storage/${user.profile_picture}`;
                    }
                    
                    return profilePictureSrc ? (
                        <img src={profilePictureSrc} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                    );
                })()}
            </div>

            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-[16px] font-medium text-white">{user.name}</span>
                {showEmail && <span className="text-muted-foreground truncate text-xs">{user.email}</span>}
            </div>
        </>
    );
}
