import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const PLATFORM_PRIMARY_BUTTON =
    'bg-[#890505] text-white hover:bg-[#6d0404] focus-visible:ring-[#890505]/30';

const PLATFORM_OUTLINE_BUTTON =
    'border-[#890505]/30 text-[#890505] hover:bg-[#890505]/5 hover:text-[#890505]';

export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Retour',
    loading = false,
    onConfirm,
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[#890505]">{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        className={PLATFORM_OUTLINE_BUTTON}
                        disabled={loading}
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        className={PLATFORM_PRIMARY_BUTTON}
                        disabled={loading}
                        onClick={onConfirm}
                    >
                        {loading ? 'Traitement...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
