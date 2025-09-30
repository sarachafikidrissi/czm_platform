import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

export default function CreateStaff() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        phone: '',
        role: '',
        agency: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/admin/create-staff');
    };

    return (
        <AppLayout>
            <Head title="Create Staff" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center gap-4">
                <Link href="/admin/dashboard">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Create Staff Member</h1>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Create New Staff Account</CardTitle>
                    <CardDescription>
                        Create a new manager or matchmaker account. Credentials will be sent via email.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                        </div>

                        <div>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                required
                            />
                            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                        </div>

                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="matchmaker">Matchmaker</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
                        </div>

                        <div>
                            <Label htmlFor="agency">Agency</Label>
                            <Input
                                id="agency"
                                type="text"
                                value={data.agency}
                                onChange={(e) => setData('agency', e.target.value)}
                                placeholder="Enter agency name"
                                required
                            />
                            {errors.agency && <p className="text-red-500 text-sm">{errors.agency}</p>}
                        </div>

                        <div className="flex space-x-4">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Staff Member'}
                            </Button>
                            <Link href="/admin/dashboard">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
            </div>
        </AppLayout>
    );
}
