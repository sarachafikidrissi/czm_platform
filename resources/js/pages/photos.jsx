import { useState, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Search, MoreVertical, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function PhotosPage({ photos, search: initialSearch = '' }) {
    const [search, setSearch] = useState(initialSearch);
    const [isUploading, setIsUploading] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState(null);
    const fileInputRef = useRef(null);
    const { flash } = usePage().props;
    
    // Handle pagination data structure
    const photosData = photos?.data || [];
    const pagination = photos || {};

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearch(value);
        router.get('/photos', { search: value, page: 1 }, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handlePageChange = (page) => {
        router.get('/photos', { 
            search: search || '', 
            page: page 
        }, {
            preserveState: true,
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

    return (
        <AppLayout breadcrumbs={[{ title: 'Photos', href: '/photos' }]}>
            <Head title="Gallery" />
            <div className="min-h-screen  pb-8">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-6 px-4 pt-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
                        {pagination.total > 0 && (
                            <span className="bg-gray-800 text-white text-sm font-medium px-3 py-1 rounded-full">
                                {pagination.total}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                type="text"
                                placeholder="Search photos"
                                value={search}
                                onChange={handleSearch}
                                className="pl-10 w-64 bg-gray-100 border-gray-200 rounded-lg"
                            />
                        </div>
                        {/* Upload Button */}
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="bg-[#096725] hover:bg-[#096725]/90 text-white"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
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
                                    {/* Options Menu */}
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
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between mt-8 px-4">
                                <div className="text-sm text-gray-600">
                                    Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total || 0} photos
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(pagination.current_page - 1)}
                                        disabled={pagination.current_page <= 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Previous
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
                                        Next
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
                                No photos yet
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Upload your first photo to get started
                            </p>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#096725] hover:bg-[#096725]/90 text-white"
                            >
                                <Upload className="w-4 h-4 mr-2 " />
                                Upload Photos
                            </Button>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!photoToDelete} onOpenChange={(open) => { if (!open) setPhotoToDelete(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Photo</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{photoToDelete?.file_name}"? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setPhotoToDelete(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
