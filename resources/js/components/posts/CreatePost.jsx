import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageIcon, VideoIcon, TypeIcon } from 'lucide-react';

export default function CreatePost() {
    const [content, setContent] = useState('');
    const [type, setType] = useState('text');
    const [mediaUrl, setMediaUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post('/posts', {
            content,
            type,
            media_url: mediaUrl,
            media_thumbnail: type === 'youtube' ? getYouTubeThumbnail(mediaUrl) : null
        }, {
            onSuccess: () => {
                setContent('');
                setMediaUrl('');
                setType('text');
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
                                <Label htmlFor="image-url">Image URL</Label>
                                <Input
                                    id="image-url"
                                    type="url"
                                    value={mediaUrl}
                                    onChange={(e) => setMediaUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    required
                                />
                            </div>
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
                            disabled={isSubmitting || !content.trim()}
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
