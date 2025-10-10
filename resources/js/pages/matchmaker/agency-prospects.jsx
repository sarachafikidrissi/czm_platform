import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AgencyProspects() {
    const { prospects = [] } = usePage().props;

    return (
        <AppLayout>
            <Head title="Agency Prospects" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Prospects for Your Agency</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.country}</TableCell>
                                        <TableCell>{p.city}</TableCell>
                                        <TableCell>{p.phone}</TableCell>
                                        <TableCell>{new Date(p.created_at ?? Date.now()).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {prospects.length === 0 && (
                            <div className="text-sm text-muted-foreground mt-4">No prospects assigned to your agency yet.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}


