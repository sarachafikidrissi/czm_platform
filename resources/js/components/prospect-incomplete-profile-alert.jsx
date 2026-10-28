import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** A prospect can only be validated once their profile is complete (same rule as the server). */
export function isProfileComplete(prospect) {
    return Boolean(prospect?.profile?.is_completed);
}

/**
 * Shown instead of the validation form when the prospect's profile is not complete,
 * with a link to complete it.
 */
export default function ProspectIncompleteProfileAlert({ prospect, onClose }) {
    const { t } = useTranslation();

    return (
        <Dialog open={Boolean(prospect)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
                        {t('profile.validateIncompleteTitle')}
                    </DialogTitle>
                    <DialogDescription>{t('profile.validateIncompleteBody')}</DialogDescription>
                </DialogHeader>
                {prospect?.name && <p className="text-sm font-semibold">{prospect.name}</p>}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('profile.validateIncompleteClose')}
                    </Button>
                    {prospect?.id && (
                        <Button asChild className="gap-2 bg-[#890505] text-white hover:bg-[#6d0404]">
                            <Link href={`/staff/prospects/${prospect.id}/profile/edit`}>
                                <Pencil className="h-4 w-4" aria-hidden />
                                {t('profile.validateIncompleteAction')}
                            </Link>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
