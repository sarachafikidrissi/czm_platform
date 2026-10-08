import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn, normalizeSearchText } from '@/lib/utils';

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
    triggerClassName?: string;
    maxVisibleOptions?: number;
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
    triggerClassName,
    maxVisibleOptions,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const listId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const normalizedQuery = normalizeSearchText(searchQuery);
    const filteredOptions = options.filter((option) =>
        normalizeSearchText(option.label).startsWith(normalizedQuery)
    );
    const visibleOptions =
        typeof maxVisibleOptions === 'number' ? filteredOptions.slice(0, maxVisibleOptions) : filteredOptions;
    const hiddenCount = filteredOptions.length - visibleOptions.length;

    const selectedOption = options.find((option) => option.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
                setActiveIndex(-1);
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

    useEffect(() => {
        if (!isOpen) return;
        setActiveIndex(visibleOptions.length > 0 ? 0 : -1);
    }, [isOpen, searchQuery, visibleOptions.length]);

    useEffect(() => {
        if (!isOpen || activeIndex < 0) return;
        document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }, [isOpen, activeIndex, listId]);

    const closeList = (restoreFocus: boolean) => {
        setIsOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
        if (restoreFocus) triggerRef.current?.focus();
    };

    const openFromTrigger = () => {
        if (disabled || isOpen) return;
        setIsOpen(true);
        setActiveIndex(visibleOptions.length > 0 ? 0 : -1);
    };

    const handleSelect = (optionValue: string) => {
        onValueChange(optionValue);
        closeList(true);
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <div
                ref={triggerRef}
                tabIndex={disabled ? -1 : 0}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listId}
                onClick={() => {
                    if (disabled) return;
                    if (isOpen) closeList(false);
                    else openFromTrigger();
                }}
                onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        openFromTrigger();
                    } else if (event.key === 'Escape' && isOpen) {
                        event.preventDefault();
                        closeList(true);
                    }
                }}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors',
                    isOpen && 'border-info ring-2 ring-info',
                    disabled && 'cursor-not-allowed opacity-50',
                    !disabled && 'cursor-pointer hover:border-border-dark focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info',
                    triggerClassName
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

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-200 p-2">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-controls={listId}
                            aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
                            onKeyDown={(event) => {
                                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                    event.preventDefault();
                                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                                    setActiveIndex((current) => {
                                        if (visibleOptions.length === 0) return -1;
                                        const start = current < 0 ? 0 : current;
                                        return Math.min(visibleOptions.length - 1, Math.max(0, start + direction));
                                    });
                                } else if (event.key === 'Enter') {
                                    event.preventDefault();
                                    const option = visibleOptions[activeIndex];
                                    if (option) handleSelect(option.value);
                                } else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    closeList(true);
                                }
                            }}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-info focus:outline-none focus:ring-2 focus:ring-info"
                        />
                    </div>

                    <div id={listId} role="listbox" className="max-h-[300px] overflow-y-auto">
                        {visibleOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
                        ) : (
                            visibleOptions.map((option, index) => {
                                const isSelected = value === option.value;
                                const isActive = index === activeIndex;
                                return (
                                    <div
                                        key={option.value}
                                        id={`${listId}-option-${index}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            'flex cursor-pointer items-center px-3 py-2 text-sm transition-colors',
                                            'hover:bg-muted',
                                            isActive && 'bg-muted',
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
                        {hiddenCount > 0 && (
                            <div className="border-t border-gray-200 px-3 py-2 text-xs text-muted-foreground">
                                {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} résultat{hiddenCount > 1 ? 's' : ''}. Affinez la recherche.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
