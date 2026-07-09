export const BILL_STATUS_META = {
    paid: { label: 'Payé', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    unpaid: { label: 'Non payé', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

export function getBillStatusMeta(status) {
    return BILL_STATUS_META[status] ?? BILL_STATUS_META.unpaid;
}
