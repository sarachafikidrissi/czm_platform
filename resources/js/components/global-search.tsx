import { useState, useEffect, useRef } from 'react';
import { Search, User, X, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface SearchUser {
    id: number;
    name: string;
    username: string;
    email: string;
    phone: string;
    status: string;
    profile_picture: string | null;
    agency: {
        id: number;
        name: string;
    } | null;
    assigned_matchmaker: {
        id: number;
        name: string;
    } | null;
}

interface GlobalSearchProps {
    role: string;
}

export function GlobalSearch({ role }: GlobalSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<SearchUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Only show for staff roles
    const shouldShow = ['admin', 'matchmaker', 'manager'].includes(role);
    
    if (!shouldShow) {
        return null;
    }

    // Debounced search
    useEffect(() => {
        if (!isOpen) return;

        const timeoutId = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch(searchQuery);
            } else {
                setUsers([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, isOpen]);

    const performSearch = async (query: string) => {
        setIsLoading(true);
        try {
            const response = await axios.get('/staff/search', {
                params: { q: query },
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });
            setUsers(response.data.users || []);
            setSelectedIndex(-1);
        } catch (error) {
            console.error('Search error:', error);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchQuery('');
                setUsers([]);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => 
                    prev < users.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
            } else if (e.key === 'Enter' && selectedIndex >= 0 && users[selectedIndex]) {
                handleUserClick(users[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, users, selectedIndex]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && resultsRef.current) {
            const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-search-container]')) {
                setIsOpen(false);
                setSearchQuery('');
                setUsers([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Keyboard shortcut (⌘K / Ctrl+K)
    useEffect(() => {
        if (!shouldShow) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shouldShow]);

    const handleUserClick = (user: SearchUser) => {
        router.visit(`/profile/${user.username}`);
        setIsOpen(false);
        setSearchQuery('');
        setUsers([]);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'client':
                return 'bg-[#096725]';
            case 'member':
                return 'bg-blue-500';
            case 'prospect':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <>
            {/* Search Trigger Button */}
            <div className="px-2 mb-2">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center justify-center px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Search users (⌘K)"
                >
                    <Search className="h-5 w-5" />
                </button>
            </div>

            {/* Search Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => {
                            setIsOpen(false);
                            setSearchQuery('');
                            setUsers([]);
                        }}
                    />
                    
                    {/* Search Container */}
                    <div 
                        data-search-container
                        className="relative z-50 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-[#096725]"
                    >
                        {/* Search Input */}
                        <div className="p-4 border-b border-[#096725]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#096725]" />
                                <Input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search for users by name, username, phone, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-10 bg-white border-[#096725] text-black placeholder:text-gray-500 focus:border-[#096725] focus:ring-[#096725] h-12 text-base"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setUsers([]);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#ff343a] hover:text-red-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-black">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#096725] mx-auto"></div>
                                    <p className="mt-2 text-black">Searching...</p>
                                </div>
                            ) : searchQuery.trim().length < 2 ? (
                                <div className="p-8 text-center text-black">
                                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50 text-[#096725]" />
                                    <p className="text-black">Type at least 2 characters to search</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="p-8 text-center text-black">
                                    <User className="h-12 w-12 mx-auto mb-2 opacity-50 text-[#096725]" />
                                    <p className="text-black">No users found</p>
                                </div>
                            ) : (
                                <div ref={resultsRef} className="divide-y divide-gray-200">
                                    {users.map((user, index) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleUserClick(user)}
                                            className={cn(
                                                "w-full p-4 text-left hover:bg-green-50 transition-colors",
                                                selectedIndex === index && "bg-green-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    {user.profile_picture ? (
                                                        <img
                                                            src={`/storage/${user.profile_picture}`}
                                                            alt={user.name}
                                                            className="h-10 w-10 rounded-full object-cover border-2 border-[#096725]"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-[#096725]">
                                                            <User className="h-5 w-5 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white",
                                                        getStatusColor(user.status)
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-black truncate">
                                                            {user.name}
                                                        </p>
                                                        {user.status && (
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                                user.status === 'client' && "bg-[#096725]/20 text-[#096725]",
                                                                user.status === 'member' && "bg-blue-500/20 text-blue-600",
                                                                user.status === 'prospect' && "bg-yellow-500/20 text-yellow-600"
                                                            )}>
                                                                {user.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        @{user.username}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                        {user.email && (
                                                            <span className="truncate">{user.email}</span>
                                                        )}
                                                        {user.phone && (
                                                            <span>{user.phone}</span>
                                                        )}
                                                    </div>
                                                    {(user.agency || user.assigned_matchmaker) && (
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            {user.agency && (
                                                                <span>Agency: {user.agency.name}</span>
                                                            )}
                                                            {user.assigned_matchmaker && (
                                                                <span>• Matchmaker: {user.assigned_matchmaker.name}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-[#096725] bg-white flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <ArrowUpDown className="h-3 w-3 text-[#096725]" />
                                    Navigate
                                </span>
                                <span>Enter to open</span>
                            </div>
                            <span>ESC to close</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

