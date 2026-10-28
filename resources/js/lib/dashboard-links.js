/**
 * Pages opened by the dashboard KPI cards and the news feed sidebar.
 * Each link uses the list filter whose definition matches the number shown on the card.
 *
 * @param {'matchmaker'|'manager'|'admin'} role
 * @param {'mine'|'agency'} scope  manager only: personal caseload or agency view
 */
export function dashboardLinks(role, scope = 'mine') {
    const agency = role === 'manager' && scope === 'agency';
    const members = (status) =>
        `/staff/validated-prospects?status=${status}${role === 'manager' && !agency ? '&scope=mine' : ''}`;
    const rdvs = (status) => `/staff/rdv?status=${status}${agency ? '&scope=agency' : ''}`;
    // Prospects: the agency prospects list (manager personal dashboard: their own caseload).
    const prospects =
        role === 'admin' ? '/admin/prospects' : `/staff/agency-prospects${role === 'manager' && !agency ? '?scope=mine' : ''}`;
    const prospectsFiltered = (statusFilter) => `${prospects}${prospects.includes('?') ? '&' : '?'}status_filter=${statusFilter}`;

    return {
        kpi: {
            prospects,
            membres: members('member'),
            clients: members('client'),
            propositions: '/staff/matchmaker/propositions?status=pending',
            rdvs: rdvs('en_cours'),
            matchs: rdvs('reussi'),
        },
        sidebar: {
            prospects,
            prospectsLate: role === 'admin' ? prospects : prospectsFiltered('en_retard'),
            prospectsUntreated: role === 'admin' ? prospects : prospectsFiltered('non_traite'),
            clients: members('client'),
            clientsInRdv: members('en_rdv'),
            clientsAwaitingRdv: members('attente_rdv'),
            activeMembers: members('member'),
            membersNotUpToDate: members('pas_a_jour'),
            rdvInProgress: rdvs('en_cours'),
            pendingPropositions: '/staff/matchmaker/propositions?status=pending',
            pendingRequests: '/staff/matchmaker/proposition-requests?type=received',
            transferRequests: '/staff/transfer-requests',
            expiredClients: members('client_expire'),
            awaitingPayment: members('en_attente_paiement'),
            objectives: '/objectives',
            profile: (username) => (username ? `/profile/${username}` : null),
        },
    };
}
