import { useState, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageIcon, VideoIcon, TypeIcon, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';

export default function CreatePost() {
    const { auth } = usePage().props;
    const [content, setContent] = useState('');
    const [type, setType] = useState('text');
    const [mediaUrl, setMediaUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const fileInputRef = useRef(null);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const imagePreviews = imageFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setSelectedImages(prev => [...prev, ...imagePreviews]);
        setType('image');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index) => {
        const newImages = selectedImages.filter((_, i) => i !== index);
        setSelectedImages(newImages);
        if (newImages.length === 0) {
            setType('text');
        }
        if (currentImageIndex >= newImages.length && newImages.length > 0) {
            setCurrentImageIndex(newImages.length - 1);
        } else if (newImages.length === 0) {
            setCurrentImageIndex(0);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('content', content);
        formData.append('type', type);

        if (type === 'image' && selectedImages.length > 0) {
            selectedImages.forEach((imageData, index) => {
                formData.append(`images[]`, imageData.file);
            });
        } else if (type === 'youtube') {
            formData.append('media_url', mediaUrl);
            formData.append('media_thumbnail', getYouTubeThumbnail(mediaUrl) || '');
        } else if (type === 'image' && mediaUrl) {
            formData.append('media_url', mediaUrl);
        }

        // Add agency_id if user is a manager
        const userRole = auth?.user?.roles?.[0]?.name;
        if (userRole === 'manager' && auth?.user?.agency_id) {
            formData.append('agency_id', auth.user.agency_id);
        }

        router.post('/posts', formData, {
            forceFormData: true,
            onSuccess: () => {
                setContent('');
                setMediaUrl('');
                setType('text');
                setSelectedImages([]);
                setCurrentImageIndex(0);
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            }
        });
    };

    const getYouTubeThumbnail = (url) => {
        if (!url) return null;
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        return videoId ? `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg` : null;
    };

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TypeIcon className="w-5 h-5" />
                    Create New Post
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs value={type} onValueChange={setType} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="text" className="flex items-center gap-2">
                                <TypeIcon className="w-4 h-4" />
                                Text
                            </TabsTrigger>
                            <TabsTrigger value="image" className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Image
                            </TabsTrigger>
                            <TabsTrigger value="youtube" className="flex items-center gap-2">
                                <VideoIcon className="w-4 h-4" />
                                YouTube
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="text" className="space-y-4">
                            <div>
                                <Label htmlFor="content">What's on your mind?</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="min-h-[100px]"
                                    required
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="image" className="space-y-4">
                            <div>
                                <Label htmlFor="content">What's on your mind?</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="min-h-[100px]"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="image-upload">Upload Images</Label>
                                <div className="flex items-center gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Select Images
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        {selectedImages.length > 0 ? `${selectedImages.length} image(s) selected` : 'No images selected'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Image Carousel Preview */}
                            {selectedImages.length > 0 && (
                                <div className="space-y-4">
                                    <Label>Preview Images</Label>
                                    <div className="relative">
                                        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
                                            <img
                                                src={selectedImages[currentImageIndex]?.preview}
                                                alt={`Preview ${currentImageIndex + 1}`}
                                                className="h-full w-full object-contain"
                                            />
                                            {selectedImages.length > 1 && (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                                                        onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : selectedImages.length - 1))}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                                                        onClick={() => setCurrentImageIndex((prev) => (prev < selectedImages.length - 1 ? prev + 1 : 0))}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white"
                                                onClick={() => removeImage(currentImageIndex)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {selectedImages.length > 1 && (
                                            <div className="mt-2 flex items-center justify-center gap-2">
                                                {selectedImages.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className={`h-2 w-2 rounded-full transition-colors ${
                                                            index === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                                                        }`}
                                                        onClick={() => setCurrentImageIndex(index)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <p className="mt-2 text-center text-sm text-muted-foreground">
                                            Image {currentImageIndex + 1} of {selectedImages.length}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Fallback: Image URL input (if no files selected) */}
                            {selectedImages.length === 0 && (
                                <div>
                                    <Label htmlFor="image-url">Or enter Image URL</Label>
                                <Input
                                    id="image-url"
                                    type="url"
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            )}
                        </TabsContent>

                        <TabsContent value="youtube" className="space-y-4">
                            <div>
                                <Label htmlFor="content">What's on your mind?</Label>
                                <Textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="min-h-[100px]"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="youtube-url">YouTube URL</Label>
                                <Input
                                    id="youtube-url"
                                    type="url"
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    required
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || !content.trim() || (type === 'image' && selectedImages.length === 0 && !mediaUrl) || (type === 'youtube' && !mediaUrl)}
                            className="bg-info hover:opacity-90"
                        >
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
