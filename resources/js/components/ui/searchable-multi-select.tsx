import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, X } from 'lucide-react';
import { Checkbox } from './checkbox';
import { cn } from '@/lib/utils';

interface Option {
    value: string;
    label: string;
}

interface SearchableMultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onSelectionChange: (values: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
}

export function SearchableMultiSelect({
    options,
    selectedValues,
    onSelectionChange,
    placeholder = 'Sélectionnez...',
    searchPlaceholder = 'Search for Location',
    emptyMessage = 'Aucun résultat trouvé',
    disabled = false,
    className,
}: SearchableMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter options based on search query
    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus search input when opened
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = (value: string) => {
        const newSelection = selectedValues.includes(value)
            ? selectedValues.filter((v) => v !== value)
            : [...selectedValues, value];
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => {
        if (selectedValues.length === filteredOptions.length) {
            // Deselect all filtered options
            const filteredValues = filteredOptions.map((opt) => opt.value);
            onSelectionChange(selectedValues.filter((v) => !filteredValues.includes(v)));
        } else {
            // Select all filtered options
            const filteredValues = filteredOptions.map((opt) => opt.value);
            const newSelection = [...new Set([...selectedValues, ...filteredValues])];
            onSelectionChange(newSelection);
        }
    };

    const handleRemoveItem = (value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectionChange(selectedValues.filter((v) => v !== value));
    };

    const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every((opt) => selectedValues.includes(opt.value));
    const selectedLabels = selectedValues
        .map((val) => options.find((opt) => opt.value === val)?.label)
        .filter(Boolean);

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {/* Input/Trigger */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'flex h-auto min-h-[40px] w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors',
                    isOpen && 'border-blue-500 ring-2 ring-blue-500',
                    disabled && 'cursor-not-allowed opacity-50',
                    !disabled && 'cursor-pointer hover:border-gray-400'
                )}
            >
                <div className="flex flex-1 flex-wrap items-center gap-1">
                    {selectedValues.length === 0 ? (
                        <span className="text-gray-500">{placeholder}</span>
                    ) : (
                        selectedLabels.map((label, index) => (
                            <span
                                key={index}
                                className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                            >
                                {label}
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleRemoveItem(selectedValues[index], e)}
                                        className="ml-1 rounded-full hover:bg-blue-200"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        ))
                    )}
                </div>
                <ChevronDownIcon
                    className={cn(
                        'h-4 w-4 text-gray-500 transition-transform',
                        isOpen && 'rotate-180'
                    )}
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    {/* Search Input */}
                    <div className="border-b border-gray-200 p-2">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</div>
                        ) : (
                            <>
                                {/* Select All */}
                                <div
                                    onClick={handleSelectAll}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm transition-colors',
                                        'hover:bg-gray-50',
                                        allFilteredSelected && 'bg-gray-50'
                                    )}
                                >
                                    <Checkbox 
                                        checked={allFilteredSelected} 
                                        onCheckedChange={(checked) => {
                                            if (checked !== allFilteredSelected) {
                                                handleSelectAll();
                                            }
                                        }}
                                    />
                                    <span className="text-gray-700">Select All</span>
                                </div>

                                {/* Options */}
                                {filteredOptions.map((option) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggle(option.value);
                                            }}
                                            className={cn(
                                                'flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm transition-colors',
                                                'hover:bg-gray-50',
                                                isSelected && 'bg-gray-50'
                                            )}
                                        >
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={isSelected} 
                                                    onCheckedChange={(checked) => {
                                                        if (checked !== isSelected) {
                                                            handleToggle(option.value);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <span className="text-gray-700">{option.label}</span>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
