import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Settings } from 'lucide-react';
import CreateStaffButton from '@/components/admin/create-staff-button';
import CreateAgencyButton from '@/components/admin/create-agency-button';
import CreateServiceButton from '@/components/admin/create-service-button';
import CreateMatrimonialPackButton from '@/components/admin/create-matrimonial-pack-button';

function AdminDashboardContent({ agencies = [], stats = { totalUsers: 0, pending: 0, approvedManagers: 0, approvedMatchmakers: 0 } }) {
    const { t } = useTranslation();
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('admin.dashboard.title')}</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboard.stats.totalUsers')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.dashboard.stats.allRegisteredUsers')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboard.stats.pendingApprovals')}</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.dashboard.stats.staffAwaitingApproval')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboard.stats.activeMatchmakers')}</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approvedMatchmakers}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.dashboard.stats.approvedMatchmakers')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboard.stats.activeManagers')}</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approvedManagers}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('admin.dashboard.stats.approvedManagers')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className=''>
                    <CardHeader>
                        <CardTitle>{t('admin.dashboard.quickActions')}</CardTitle>
                        <CardDescription>
                            {t('admin.dashboard.commonAdministrativeTasks')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 ">
                        {/* <Link href="/admin/dashboard" className='m-0 p-0'>
                            <Button className=" justify-start">
                                <Users className="w-4 h-4 mr-2" />
                                Manage Staff
                            </Button>
                        </Link> */}
                        <CreateStaffButton className="" agencies={agencies} />
                        <CreateAgencyButton className=" justify-start" />
                        <CreateServiceButton className=" justify-start" />
                        <CreateMatrimonialPackButton className=" justify-start" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.dashboard.recentActivity')}</CardTitle>
                        <CardDescription>
                            {t('admin.dashboard.latestSystemActivities')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {t('admin.dashboard.noRecentActivity')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AdminDashboardContent