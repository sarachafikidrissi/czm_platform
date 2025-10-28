import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { useState } from 'react';

export default function ValidatedProspects() {
    const { prospects, status, assignedMatchmaker } = usePage().props;
    const [loading, setLoading] = useState({});
    console.log(prospects);

    const handleMarkAsClient = (userId) => {
        setLoading(prev => ({ ...prev, [userId]: true }));
        
        router.post('/staff/mark-as-client', {
            user_id: userId
        }, {
            onSuccess: () => {
                setLoading(prev => ({ ...prev, [userId]: false }));
            },
            onError: () => {
                setLoading(prev => ({ ...prev, [userId]: false }));
            }
        });
    };
    
    return (
        <AppLayout>
            <Head title="Validated Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">Validated Prospects</h1>
                        <Badge variant="outline">{prospects.length} users</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Status</Label>
                            <Select value={status || 'all'} onValueChange={(v) => router.visit(`/staff/validated-prospects?status=${v}`, { preserveScroll: true, preserveState: true, replace: true })}>
                                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="client">Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle>Validated Users</CardTitle>
                        <CardDescription>
                            {prospects.length > 0 
                                ? `Showing ${prospects.length} validated users based on your role permissions.`
                                : 'No validated users found based on your role permissions.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pack</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Origin Agency</TableHead>
                                    <TableHead>Manager at Validation</TableHead>
                                    <TableHead>Validated By</TableHead>
                                    <TableHead>Validated Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell><input type="checkbox" className="accent-neutral-800" /></TableCell>
                                        <TableCell className="font-medium">{u.name}</TableCell>
                                        <TableCell>{u.phone}</TableCell>
                                        <TableCell>
                                            <Badge className={`capitalize ${
                                                u.status === 'member' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {u.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.profile?.matrimonial_pack?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.subscriptions && u.subscriptions.length > 0 ? (
                                                <div className="text-xs">
                                                    <div className="font-medium">
                                                        {u.subscriptions[0].subscription_start ? 
                                                            new Date(u.subscriptions[0].subscription_start).toLocaleDateString() : 'N/A'
                                                        } - {u.subscriptions[0].subscription_end ? 
                                                            new Date(u.subscriptions[0].subscription_end).toLocaleDateString() : 'N/A'
                                                        }
                                                    </div>
                                                    <Badge variant="outline" className={`text-xs ${
                                                        u.subscriptions[0].status === 'active' ? 'bg-green-50 text-green-700' :
                                                        u.subscriptions[0].status === 'expired' ? 'bg-red-50 text-red-700' :
                                                        'bg-gray-50 text-gray-700'
                                                    }`}>
                                                        {u.subscriptions[0].status}
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">No subscription</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.agency?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.validated_by_manager?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.approved_by ? u.assigned_matchmaker.name : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.approved_at ? new Date(u.approved_at).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {u.status === 'member' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleMarkAsClient(u.id)}
                                                    disabled={loading[u.id]}
                                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                >
                                                    {loading[u.id] ? 'Processing...' : 'Mark as Client'}
                                                </Button>
                                            )}
                                            {u.status === 'client' && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    Client
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}


