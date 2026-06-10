import { useEffect, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Modal, ModalHeader } from './Modal';
import { Button, NumberField } from './controls';

export default function EditObjectivesModal({
    open,
    onClose,
    isMobile,
    period,
    staff,
    filters,
    existingObjectives = {},
}) {
    const { showToast } = useToast();

    const form = useForm({
        user_ids: [],
        target_ventes: '',
        target_membres: '',
        target_rdv: '',
        target_match: '',
        month: filters?.month ?? '',
        year: filters?.year ?? '',
    });
    const { data, setData, post, processing, reset, clearErrors } = form;

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
            setData((d) => ({
                ...d,
                month: filters?.month ?? '',
                year: filters?.year ?? '',
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, filters?.month, filters?.year]);

    useEffect(() => {
        if (!open || data.user_ids.length !== 1) return;
        const existing = existingObjectives[String(data.user_ids[0])];
        if (!existing) return;
        setData((d) => ({
            ...d,
            target_ventes: String(existing.target_ventes ?? ''),
            target_membres: String(existing.target_membres ?? ''),
            target_rdv: String(existing.target_rdv ?? ''),
            target_match: String(existing.target_match ?? ''),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, data.user_ids, existingObjectives]);

    const toggle = (id) =>
        setData('user_ids', data.user_ids.includes(id)
            ? data.user_ids.filter((x) => x !== id)
            : [...data.user_ids, id]);

    const hint = useMemo(() => {
        if (data.user_ids.length === 0) return null;
        if (data.user_ids.length === 1) {
            const p = staff.find((s) => s.id === data.user_ids[0]);
            const hasExisting = existingObjectives[String(data.user_ids[0])];
            return hasExisting
                ? `Objectif pour ${p?.name} — valeurs pré-remplies.`
                : `Objectif pour ${p?.name}`;
        }
        return `${data.user_ids.length} personnes sélectionnées — les valeurs s'appliquent à chacune.`;
    }, [data.user_ids, staff, existingObjectives]);

    const submit = () => {
        const payload = {
            target_ventes: data.target_ventes,
            target_membres: data.target_membres,
            target_rdv: data.target_rdv || 0,
            target_match: data.target_match || 0,
        };

        const singleExisting =
            data.user_ids.length === 1 ? existingObjectives[String(data.user_ids[0])] : null;

        const onSuccess = (isUpdate) => {
            showToast(
                isUpdate ? 'Objectif mis à jour' : 'Objectif enregistré',
                undefined,
                'success'
            );
            onClose();
        };

        const onError = () => {
            showToast('Erreur lors de l\'enregistrement', undefined, 'error');
        };

        if (singleExisting?.id) {
            router.put(route('objectives.update', singleExisting.id), payload, {
                preserveScroll: true,
                onSuccess: () => onSuccess(true),
                onError,
            });
            return;
        }

        post(route('objectives.store'), {
            ...payload,
            user_ids: data.user_ids,
            month: parseInt(data.month, 10),
            year: parseInt(data.year, 10),
            preserveScroll: true,
            onSuccess: () => onSuccess(false),
            onError,
        });
    };

    return (
        <Modal open={open} onClose={onClose} isMobile={isMobile} maxWidth={520}>
            <ModalHeader
                title={`Définir les objectifs — ${period?.label ?? ''}`}
                subtitle="Les valeurs s'appliquent individuellement à chaque personne sélectionnée."
                onClose={onClose}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-[12px] font-semibold text-neutral-700 mb-2">Sélectionner les conseillers / managers</p>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <div className="overflow-y-auto divide-y divide-neutral-100" style={{ maxHeight: 180 }}>
                        {staff.map((s) => {
                            const on = data.user_ids.includes(s.id);
                            return (
                                <label
                                    key={s.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${on ? 'bg-[#890505]/[0.035]' : 'hover:bg-neutral-50'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={on}
                                        onChange={() => toggle(s.id)}
                                        className="w-4 h-4 rounded border-neutral-300 cursor-pointer"
                                        style={{ accentColor: '#890505' }}
                                    />
                                    <span className="text-[13px] text-neutral-800 flex-1">{s.name}</span>
                                    <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded ${s.role === 'Manager' ? 'bg-[#0b2724]/10 text-[#0b2724]' : 'bg-neutral-100 text-neutral-500'}`}>{s.role}</span>
                                    <span className="text-[11px] text-neutral-400 w-[72px] text-right truncate">{s.agency}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {hint && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-neutral-100/80">
                        <p className="text-[12px] text-neutral-600">{hint}</p>
                    </div>
                )}

                <div className="h-px bg-neutral-100 my-4" />

                <div className="grid grid-cols-2 gap-3">
                    <NumberField label="Ventes cibles" suffix="MAD" value={data.target_ventes} onChange={(v) => setData('target_ventes', v)} decimal />
                    <NumberField label="Membres cibles" value={data.target_membres} onChange={(v) => setData('target_membres', v)} />
                    <NumberField label="RDV cibles" value={data.target_rdv} onChange={(v) => setData('target_rdv', v)} note="Non actif dans les calculs" />
                    <NumberField label="Match cibles" value={data.target_match} onChange={(v) => setData('target_match', v)} note="Non actif dans les calculs" />
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-neutral-100 flex-shrink-0">
                <Button variant="secondary" onClick={onClose} disabled={processing}>Annuler</Button>
                <Button variant="primary" icon={Check} onClick={submit} disabled={processing || data.user_ids.length === 0}>
                    Enregistrer
                </Button>
            </div>
        </Modal>
    );
}
