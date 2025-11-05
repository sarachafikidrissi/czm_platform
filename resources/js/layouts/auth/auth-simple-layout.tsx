import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
    className?: string;
}

export default function AuthSimpleLayout({ children, title, description, className }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className={(` flex flex-col items-center justify-center px-4 py-0 font-nunito ${className}`)}>
            <div className="w-full">
                <div className="flex flex-col gap-y-0.5">
                    <div className="flex flex-col items-center">
                        <Link href={route('home')} className="flex flex-col items-center gap-1 font-medium">
                            <div className=" flex h-16 w-16 items-center justify-center rounded-md">
                                <img src='/images/czm_Logo.png'  className="w-full h-full fill-current text-[var(--foreground)] dark:text-white" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className=" text-center mt-1">
                            <h1 className="text-lg font-medium">{title}</h1>
                            <p className="text-muted-foreground text-center text-xs mt-0.5">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
