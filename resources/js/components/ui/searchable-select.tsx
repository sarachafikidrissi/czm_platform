import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = 'Sélectionnez...',
    searchPlaceholder = 'Rechercher...',
    emptyMessage = 'Aucun résultat trouvé',
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedOption = options.find((option) => option.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onValueChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {/* Input/Trigger */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors',
                    isOpen && 'border-info ring-2 ring-info',
                    disabled && 'cursor-not-allowed opacity-50',
                    !disabled && 'cursor-pointer hover:border-border-dark'
                )}
            >
                <span className={cn('flex-1 truncate', !selectedOption && 'text-muted-foreground')}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDownIcon
                    className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
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
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-2 focus:ring-info"
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = value === option.value;
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            'flex cursor-pointer items-center px-3 py-2 text-sm transition-colors',
                                            'hover:bg-muted',
                                            isSelected && 'bg-info-light text-info'
                                        )}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && (
                                            <span className="ml-auto text-info">✓</span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
