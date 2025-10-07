import React from 'react';

type ReadOnlyFieldProps = {
    label: string;
    value: string | number | null | undefined;
};

export default function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
    const display = value === null || value === undefined || value === '' ? 'Non renseigné' : String(value);
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
                type="text"
                value={display}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
            />
        </div>
    );
}


