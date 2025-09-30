import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HeartHandshake, CheckCircle, User } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

export default function UserMatchmakers() {
    const { matchmakers, assignedMatchmaker } = usePage().props;

    const handleSelectMatchmaker = (matchmakerId) => {
        router.post(`/user/matchmakers/${matchmakerId}/select`);
    };

    return (
        <AppLayout>
            <Head title="Choose Matchmaker" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Choose Matchmaker</h1>
                    {assignedMatchmaker && (
                        <Badge className="bg-green-100 text-green-800">
                            Assigned to: {assignedMatchmaker.name}
                        </Badge>
                    )}
                </div>
                {!assignedMatchmaker && (
                    <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">View</Label>
                            <Select defaultValue="all">
                                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="agency">By Agency</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                        <Input placeholder="Search" className="h-9 w-[220px]" />
                    </div>
                )}
            </div>

            {assignedMatchmaker ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                            Your Assigned Matchmaker
                        </CardTitle>
                        <CardDescription>
                            You have been assigned to a matchmaker
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{assignedMatchmaker.name}</h3>
                                <p className="text-sm text-gray-600">{assignedMatchmaker.email}</p>
                                <p className="text-sm text-gray-600">Agency: {assignedMatchmaker.agency}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle>Available Matchmakers</CardTitle>
                        <CardDescription>
                            Choose a matchmaker to help you find your perfect match
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matchmakers.map((matchmaker) => (
                                    <TableRow key={matchmaker.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{matchmaker.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(matchmaker.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                        <TableCell>{matchmaker.agency}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelectMatchmaker(matchmaker.id)}
                                            >
                                                <HeartHandshake className="w-4 h-4 mr-2" />
                                                Select
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                        {matchmakers.length === 0 && (
                            <div className="text-center py-8">
                                <HeartHandshake className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">No matchmakers available at the moment.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            </div>
        </AppLayout>
    );
}
