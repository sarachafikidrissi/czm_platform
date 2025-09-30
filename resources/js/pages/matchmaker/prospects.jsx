import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, User } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';

export default function MatchmakerProspects() {
    const { prospects } = usePage().props;
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [notes, setNotes] = useState('');
    const [recommendations, setRecommendations] = useState('');

    const handleValidate = (prospect) => {
        setSelectedProspect(prospect);
        setNotes('');
        setRecommendations('');
    };

    const submitValidation = () => {
        router.post(`/matchmaker/prospects/${selectedProspect.id}/validate`, {
            notes,
            recommendations,
        });
    };

    return (
        <AppLayout>
            <Head title="Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Prospects</h1>
                    <Badge variant="outline">{prospects.length} prospects</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">View</Label>
                        <Select defaultValue="all">
                            <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="complete">Profile Complete</SelectItem>
                                <SelectItem value="incomplete">Incomplete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                    <Input placeholder="Search" className="h-9 w-[220px]" />
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" className="h-9">
                            Date Range
                        </Button>
                        <Button variant="outline" className="h-9">
                            Filter
                        </Button>
                    </div>
                </div>
            </div>

                <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle>Available Prospects</CardTitle>
                    <CardDescription>
                        Review and validate prospects to assign them to your care
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Profile</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prospects.map((prospect) => (
                                <TableRow key={prospect.id}>
                                    <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                    <TableCell className="font-medium">{prospect.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(prospect.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                    <TableCell>{prospect.phone}</TableCell>
                                    <TableCell>
                                        {prospect.profile ? (
                                            <Badge className="bg-green-100 text-green-800">
                                                Profile Complete
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-yellow-100 text-yellow-800">
                                                Profile Incomplete
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleValidate(prospect)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Validate
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Validate Prospect</DialogTitle>
                                                    <DialogDescription>
                                                        Add notes and recommendations for {prospect.name}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="notes">Notes</Label>
                                                        <Textarea
                                                            id="notes"
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                            placeholder="Add your notes about this prospect..."
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="recommendations">Recommendations</Label>
                                                        <Textarea
                                                            id="recommendations"
                                                            value={recommendations}
                                                            onChange={(e) => setRecommendations(e.target.value)}
                                                            placeholder="Add your recommendations..."
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={submitValidation}>
                                                        Validate & Assign
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    {prospects.length === 0 && (
                        <div className="text-center py-8">
                            <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No prospects available at the moment.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>
        </AppLayout>
    );
}
