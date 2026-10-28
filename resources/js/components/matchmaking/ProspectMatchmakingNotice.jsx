import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Shown instead of matchmaking results while the profile is still a prospect (not validated yet).
export default function ProspectMatchmakingNotice({ backHref = null }) {
    const { t } = useTranslation();

    return (
        <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-6">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <UserCheck className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-amber-900">{t('profile.matchmakingProspectTitle')}</h3>
                    <p className="mt-1 text-sm text-amber-800">{t('profile.matchmakingProspectBody')}</p>
                    {backHref && (
                        <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
                            <Link href={backHref}>
                                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                                {t('profile.matchmakingProspectBack')}
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
