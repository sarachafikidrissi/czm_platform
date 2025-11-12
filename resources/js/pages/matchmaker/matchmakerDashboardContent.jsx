import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import {
    Users,
    DollarSign,
    FileText,
    ClipboardList,
    Target,
    TrendingUp,
    Calendar,
    Building2,
    UserCheck,
    Activity,
} from 'lucide-react';

const COLORS = {
    success: '#096725',
    error: '#ff343a',
    warning: '#f59e0b',
    primary: '#096725',
    chart1: '#49e670',
    chart2: '#03e78b',
    chart3: '#86cd91',
    chart4: '#52c5b6',
    chart5: '#339966',
};

function MatchMakerDashboardContent() {
    const { t } = useTranslation();
    const { props } = usePage();
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Filter state
    const [timeRange, setTimeRange] = useState('month');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Fetch statistics
    useEffect(() => {
        fetchStatistics();
    }, [timeRange, month, year]);

    const fetchStatistics = () => {
        setLoading(true);
        const params = {
            time_range: timeRange,
            month,
            year,
        };

        router.get('/admin/matchmaker-statistics', params, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                setStatistics(page.props.statistics || []);
                setLoading(false);
            },
            onError: () => {
                setLoading(false);
            },
        });
    };

    // Generate months and years for select
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
    }));

    const years = Array.from({ length: 10 }, (_, i) => {
        const y = new Date().getFullYear() - i;
        return { value: y, label: y.toString() };
    });

    // Prepare chart data
    const prepareChartData = (data, key) => {
        if (!data || !Array.isArray(data)) return [];
        if (typeof data === 'object' && !Array.isArray(data)) {
            return Object.entries(data).map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
                value: typeof value === 'object' ? value.count || value.total || 0 : value,
            }));
        }
        return data;
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'MAD',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const stat = statistics.length > 0 ? statistics[0] : null;

    if (loading) {
        return (
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
            </div>
        );
    }

    if (!stat) {
        return (
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-6">
                    <div className="text-lg font-semibold">{t('navigation.matchmakerStatistics')}</div>
                    <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                        {t('statistics.noData')}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">{t('navigation.matchmakerStatistics')}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('statistics.description')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('statistics.filters')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                {t('statistics.timeRange')}
                            </label>
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="month">{t('statistics.month')}</SelectItem>
                                    <SelectItem value="quarter">{t('statistics.quarter')}</SelectItem>
                                    <SelectItem value="year">{t('statistics.year')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {timeRange === 'month' && (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        {t('statistics.month')}
                                    </label>
                                    <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map((m) => (
                                                <SelectItem key={m.value} value={m.value.toString()}>
                                                    {m.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        {t('statistics.year')}
                                    </label>
                                    <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((y) => (
                                                <SelectItem key={y.value} value={y.value.toString()}>
                                                    {y.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">{t('statistics.overview')}</TabsTrigger>
                    <TabsTrigger value="users">{t('statistics.users')}</TabsTrigger>
                    <TabsTrigger value="bills">{t('statistics.bills')}</TabsTrigger>
                    <TabsTrigger value="subscriptions">{t('statistics.subscriptions')}</TabsTrigger>
                    <TabsTrigger value="evaluations">{t('statistics.evaluations')}</TabsTrigger>
                    <TabsTrigger value="objectives">{t('statistics.objectives')}</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('statistics.totalUsers')}
                                </CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stat.users?.total_assigned || 0}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('statistics.totalSales')}
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(stat.bills?.total_sales || 0)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('statistics.activeSubscriptions')}
                                </CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stat.subscriptions?.active_count || 0}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('statistics.totalEvaluations')}
                                </CardTitle>
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stat.evaluations?.total || 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Status Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.userStatusDistribution')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={prepareChartData(stat.users?.by_status)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) =>
                                                `${name}: ${(percent * 100).toFixed(0)}%`
                                            }
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {prepareChartData(stat.users?.by_status).map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={Object.values(COLORS)[index % Object.keys(COLORS).length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.salesTrend')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={stat.bills?.trends || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="period" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke={COLORS.success}
                                            fill={COLORS.chart1}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.totalAssigned')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {stat.users?.total_assigned || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.activeUsers')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-success">
                                    {stat.users?.active || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.validatedUsers')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-success">
                                    {stat.users?.validated || 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('statistics.conversionFunnel')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={prepareChartData(stat.users?.funnel)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill={COLORS.success} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bills Tab */}
                <TabsContent value="bills" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.totalSales')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-success">
                                    {formatCurrency(stat.bills?.total_sales || 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.salesCount')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {stat.bills?.sales_count || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.averageAmount')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {formatCurrency(stat.bills?.average_amount || 0)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('statistics.salesTrend')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={stat.bills?.trends || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke={COLORS.success}
                                        strokeWidth={2}
                                        name={t('statistics.total')}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke={COLORS.chart2}
                                        strokeWidth={2}
                                        name={t('statistics.count')}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Subscriptions Tab */}
                <TabsContent value="subscriptions" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.activeSubscriptions')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-success">
                                    {stat.subscriptions?.active_count || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.expiredSubscriptions')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-error">
                                    {stat.subscriptions?.expired_count || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('statistics.averageDuration')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {stat.subscriptions?.average_duration?.toFixed(1) || 0} {t('statistics.months')}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('statistics.packDistribution')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={stat.subscriptions?.pack_distribution || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="pack_name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill={COLORS.success} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Evaluations Tab */}
                <TabsContent value="evaluations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('statistics.totalEvaluations')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {stat.evaluations?.total || 0}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('statistics.evaluationsByStatus')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={prepareChartData(stat.evaluations?.by_status)}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) =>
                                            `${name}: ${(percent * 100).toFixed(0)}%`
                                        }
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {prepareChartData(stat.evaluations?.by_status).map(
                                            (entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        Object.values(COLORS)[
                                                            index % Object.keys(COLORS).length
                                                        ]
                                                    }
                                                />
                                            )
                                        )}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Objectives Tab */}
                <TabsContent value="objectives" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">{t('statistics.ventes')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.realized')}</span>
                                        <span className="font-bold">
                                            {formatCurrency(stat.objectives?.realized_ventes || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.target')}</span>
                                        <span>
                                            {formatCurrency(stat.objectives?.target_ventes || 0)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={stat.objectives?.progress?.ventes || 0}
                                        className="h-2"
                                    />
                                    <div className="text-xs text-muted-foreground text-center">
                                        {stat.objectives?.progress?.ventes?.toFixed(1) || 0}%
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">{t('statistics.membres')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.realized')}</span>
                                        <span className="font-bold">
                                            {stat.objectives?.realized_membres || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.target')}</span>
                                        <span>{stat.objectives?.target_membres || 0}</span>
                                    </div>
                                    <Progress
                                        value={stat.objectives?.progress?.membres || 0}
                                        className="h-2"
                                    />
                                    <div className="text-xs text-muted-foreground text-center">
                                        {stat.objectives?.progress?.membres?.toFixed(1) || 0}%
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">{t('statistics.rdv')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.realized')}</span>
                                        <span className="font-bold">
                                            {stat.objectives?.realized_rdv || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.target')}</span>
                                        <span>{stat.objectives?.target_rdv || 0}</span>
                                    </div>
                                    <Progress
                                        value={stat.objectives?.progress?.rdv || 0}
                                        className="h-2"
                                    />
                                    <div className="text-xs text-muted-foreground text-center">
                                        {stat.objectives?.progress?.rdv?.toFixed(1) || 0}%
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">{t('statistics.match')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.realized')}</span>
                                        <span className="font-bold">
                                            {stat.objectives?.realized_match || 0}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('statistics.target')}</span>
                                        <span>{stat.objectives?.target_match || 0}</span>
                                    </div>
                                    <Progress
                                        value={stat.objectives?.progress?.match || 0}
                                        className="h-2"
                                    />
                                    <div className="text-xs text-muted-foreground text-center">
                                        {stat.objectives?.progress?.match?.toFixed(1) || 0}%
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default MatchMakerDashboardContent;
