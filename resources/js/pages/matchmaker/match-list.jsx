import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MatchList() {
    const { t } = useTranslation();

    return (
        <AppLayout>
            <Head title={t('navigation.matchList')} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('navigation.matchList')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">This page will be implemented later.</p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

