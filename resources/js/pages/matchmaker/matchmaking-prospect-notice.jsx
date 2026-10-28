import ProspectMatchmakingNotice from '@/components/matchmaking/ProspectMatchmakingNotice';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

// Rendered by /staff/match/results/{user} when the user is still a prospect.
export default function MatchmakingProspectNotice({ userA }) {
    const { t } = useTranslation();

    return (
        <AppLayout>
            <Head title={t('profile.matchmakingProspectTitle')} />
            <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
                {userA?.name && <h1 className="text-2xl font-bold tracking-tight text-foreground">{userA.name}</h1>}
                <ProspectMatchmakingNotice backHref={userA?.username ? `/profile/${userA.username}` : null} />
            </div>
        </AppLayout>
    );
}
