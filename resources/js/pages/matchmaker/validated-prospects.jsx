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

export default function ValidatedProspects() {
    const { prospects, status } = usePage().props;

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
                                    <TableHead>Validated By</TableHead>
                                    <TableHead>Validated Date</TableHead>
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
                                            {u.approved_by ? u.approved_by.name : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {u.approved_at ? new Date(u.approved_at).toLocaleDateString() : 'N/A'}
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


