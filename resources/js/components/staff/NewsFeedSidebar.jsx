import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function NewsFeedSidebar({ statistics, role }) {
    if (!statistics) {
        return null;
    }

    return (
        <div className="w-full space-y-4">
            {/* Production par agence */}
            {statistics.productionByAgency && statistics.productionByAgency.length > 0 && (
                <Card className="border-2 border-black">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Production par agence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {statistics.productionByAgency.map((agency, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>{agency.name}</span>
                                    <span className="font-medium">{agency.percentage}%</span>
                                </div>
                                <Progress value={agency.percentage} className="h-2" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Mes prospects */}
            {statistics.prospects && (
                <Card className="border-2 border-black">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-[#890505]">
                            Mes prospects <span className="text-black font-normal">{statistics.prospects.total || 0}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Prospects en retard :</span>
                            <span className="font-medium text-[#890505]">{statistics.prospects.late || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Prospects non traités :</span>
                            <span className="font-medium text-[#890505]">{statistics.prospects.untreated || 0}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mes Clients */}
            {statistics.clients && (
                <Card className="border-2 border-black">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-[#890505]">
                            Mes Clients <span className="text-black font-normal">{statistics.clients.total || 0}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>En RDV :</span>
                            <span className="font-medium text-[#096725]">{(statistics.clients.inAppointment || 0)} 😊</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Pas en RDV :</span>
                            <span className="font-medium text-[#890505]">{(statistics.clients.notInAppointment || 0)} 😐</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Les clients non contactés pour plus d'une semaine :</span>
                            <span className="font-medium text-[#890505]">{statistics.clients.notContacted || 0}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mes Membres Actifs */}
            {statistics.activeMembers && (
                <Card className="border-2 border-black">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-[#890505]">
                            Mes Membres Actifs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div>
                            <span>Vous avez </span>
                            <span className="font-bold text-black">{statistics.activeMembers.total || 0}</span>
                            <span> membres</span>
                        </div>
                        <div>
                            <span>&gt; </span>
                            <span className="font-bold text-[#890505]">{statistics.activeMembers.notUpToDate || 0}</span>
                            <span> ne sont pas à jour.</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Derniers Membres */}
            {statistics.latestMembers && statistics.latestMembers.length > 0 && (
                <Card className="border-2 border-black">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Derniers Membres</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {statistics.latestMembers.map((member) => (
                            <div key={member.id} className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                    {member.profile_picture ? (
                                        <img
                                            src={`/storage/${member.profile_picture}`}
                                            alt={member.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {member.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{member.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Mes Matchmakers */}
            {statistics.matchmakers && statistics.matchmakers.length > 0 && (
                <Card className="border-2 border-black">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Mes Matchmakers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {statistics.matchmakers.map((matchmaker) => (
                            <div key={matchmaker.id} className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                    {matchmaker.profile_picture ? (
                                        <img
                                            src={`/storage/${matchmaker.profile_picture}`}
                                            alt={matchmaker.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {matchmaker.name?.charAt(0)?.toUpperCase() || 'M'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{matchmaker.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{matchmaker.email}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

