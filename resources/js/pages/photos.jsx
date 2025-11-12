import { useState, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Search, MoreVertical, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function PhotosPage({ 
    photos, 
    search: initialSearch = '', 
    targetUser = null,
    availableUsers = [],
    canUpload = true,
    canDelete = true
}) {
    const [search, setSearch] = useState(initialSearch);
    const [userSearch, setUserSearch] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState(null);
    const fileInputRef = useRef(null);
    const { flash, auth } = usePage().props;
    
    // Handle pagination data structure
    const photosData = photos?.data || [];
    const pagination = photos || {};

    // const handleSearch = (e) => {
    //     const value = e.target.value;
    //     setSearch(value);
    //     const params = { search: value, page: 1 };
    //     if (targetUser?.id) {
    //         params.user_id = targetUser.id;
    //     }
    //     router.get('/photos', params, {
    //         preserveState: false,
    //         preserveScroll: false,
    //     });
    // };

    const handlePageChange = (page) => {
        const params = { 
            search: search || '', 
            page: page 
        };
        if (targetUser?.id) {
            params.user_id = targetUser.id;
        }
        router.get('/photos', params, {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const handleUserChange = (userId) => {
        const params = { 
            search: search || '', 
            page: 1 
        };
        if (userId && userId !== 'current') {
            params.user_id = userId;
        }
        router.get('/photos', params, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('photos[]', file);
        });

        router.post('/photos', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: () => {
                setIsUploading(false);
            },
        });
    };

    const handleDeleteClick = (photoId) => {
        const photo = photosData.find(p => p.id === photoId);
        setPhotoToDelete(photo);
    };

    const confirmDelete = () => {
        if (photoToDelete) {
            router.delete(`/photos/${photoToDelete.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setPhotoToDelete(null);
                },
            });
        }
    };

    const { t } = useTranslation();
    
    return (
        <AppLayout breadcrumbs={[{ title: t('breadcrumbs.photos'), href: '/photos' }]}>
            <Head title={t('photos.title')} />
            <div className="min-h-screen  pb-8">
                {/* Header Section */}
                <div className="flex flex-col gap-4 mb-6 px-4 pt-4 max-md:flex-col ">
                    <div className="flex items-center justify-between  max-md:flex-col">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">{t('photos.title')}</h1>
                            {pagination.total > 0 && (
                                <span className="bg-gray-800 text-white text-sm font-medium px-3 py-1 rounded-full">
                                    {pagination.total}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 ">
                            {/* Search Bar */}
                            {/* <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search photos"
                                    value={search}
                                    onChange={handleSearch}
                                    className="pl-10 w-64 bg-gray-100 border-gray-200 rounded-lg"
                                />
                            </div> */}
                            {/* Upload Button - Only show if canUpload */}
                            {canUpload && (
                                <>
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="bg-[#096725] hover:bg-[#096725]/90 text-white"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {isUploading ? t('photos.uploading') : t('photos.upload')}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* User Selector and Info - Only show if viewing other users' photos */}
                    {(availableUsers.length > 0 || targetUser) && (
                        <div className="flex items-center gap-4 max-md:flex-col-reverse">
                            {availableUsers.length > 0 && (
                                <div className="flex flex-col gap-2 w-full max-w-md">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700 ">{t('photos.viewPhotosOf')} {targetUser?.name !== auth.user.name ? targetUser.name :  ''}</label>
                                    </div>
                                    <div className="flex max-md:flex-col gap-2">
                                        {/* Search Input for Users */}
                                        <div className="relative w-[30vw] max-md:w-full">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <Input
                                                type="text"
                                                placeholder={t('photos.searchPlaceholder')}
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                className="pl-10 w-full bg-gray-100 border-gray-200 rounded-lg"
                                            />
                                        </div>
                                        {/* User Select */}
                                        <Select
                                            value={targetUser?.id?.toString() || 'current'}
                                            onValueChange={handleUserChange}
                                        >
                                            <SelectTrigger className="max-md:w-full w-[30vw]">
                                                <SelectValue placeholder={t('photos.selectUser')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableUsers
                                                    .filter((user) => {
                                                        if (!userSearch.trim()) return true;
                                                        const searchLower = userSearch.toLowerCase();
                                                        return (
                                                            user.name?.toLowerCase().includes(searchLower) ||
                                                            user.email?.toLowerCase().includes(searchLower)
                                                        );
                                                    })
                                                    .map((user) => (
                                                        <SelectItem key={user.id} value={user.id.toString()}>
                                                            {user.name} ({user.email})
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Success/Error Messages */}
                {flash?.success && (
                    <div className="mx-4 mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                        {flash.success}
                    </div>
                )}

                {/* Gallery Grid */}
                {photosData.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
                            {photosData.map((photo) => (
                            <div
                                key={photo.id}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Image */}
                                <div className="relative aspect-square bg-gray-100">
                                    <img
                                        src={`/storage/${photo.url}`}
                                        alt={photo.file_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Info Section */}
                                <div className="p-4 flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {photo.file_name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {photo.created_at}
                                        </p>
                                    </div>
                                    {/* Options Menu - Only show if canDelete */}
                                    {canDelete && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 ml-2"
                                                >
                                                    <MoreVertical className="h-4 w-4 text-gray-600" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(photo.id)}
                                                    variant="destructive"
                                                    className="bg-red-600! text-white! hover:bg-red-600/90! hover:text-white!"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    {t('photos.delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between mt-8 px-4">
                                <div className="text-sm text-gray-600">
                                    {t('photos.showingPhotos', { from: pagination.from || 0, to: pagination.to || 0, total: pagination.total || 0 })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.current_page - 1)}
                                        disabled={pagination.current_page <= 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        {t('photos.previous')}
                                    </Button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.last_page <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.current_page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.current_page >= pagination.last_page - 2) {
                                                pageNum = pagination.last_page - 4 + i;
                                            } else {
                                                pageNum = pagination.current_page - 2 + i;
                                            }
                                            
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={pagination.current_page === pageNum ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className="w-10 h-10 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.current_page + 1)}
                                        disabled={pagination.current_page >= pagination.last_page}
                                    >
                                        {t('photos.next')}
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {!targetUser && availableUsers.length === 0 
                                    ? t('photos.noAssignedUsers')
                                    : targetUser && targetUser.id !== auth?.user?.id
                                    ? t('photos.noPhotosForUser', { userName: targetUser.name })
                                    : t('photos.noPhotosYet')}
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {!targetUser && availableUsers.length === 0
                                    ? t('photos.noAssignedUsersMessage')
                                    : targetUser && targetUser.id !== auth?.user?.id
                                    ? t('photos.noPhotosForUserMessage')
                                    : t('photos.noPhotosYetMessage')}
                            </p>
                            {canUpload && (
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-[#096725] hover:bg-[#096725]/90 text-white"
                                >
                                    <Upload className="w-4 h-4 mr-2 " />
                                    {t('photos.uploadPhotos')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!photoToDelete} onOpenChange={(open) => { if (!open) setPhotoToDelete(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('photos.deletePhoto')}</DialogTitle>
                            <DialogDescription>
                                {t('photos.deleteConfirm', { fileName: photoToDelete?.file_name })}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setPhotoToDelete(null)}
                            >
                                {t('photos.cancel')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                {t('photos.delete')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
