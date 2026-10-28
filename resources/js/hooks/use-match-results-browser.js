import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

export const MATCH_RESULTS_PER_PAGE = 6;

const ALL = 'all';
export const UNASSIGNED = 'unassigned';

const byLabel = (a, b) => a.label.localeCompare(b.label, 'fr');
const toOption = (item) => ({ value: String(item.id), label: item.name });

/**
 * Matchmaking results browser shared by the results page and the profile "matchmaking" tab.
 *
 * - No criteria: the compatible results already loaded (`rows`), 6 per page.
 * - A name (2+ characters), an agency or a matchmaker: searches the whole base of opposite-gender
 *   profiles on the server (`searchUrl`), 6 per page. Profiles that cannot be proposed come back with
 *   a `restriction` flag; profiles missing from the compatible results get `outside_compatible`.
 *   Without `searchUrl` (viewer not allowed to search) the criteria filter the loaded rows instead.
 *
 * `allOptions` ({ agencies, matchmakers } from the server) lists every agency / matchmaker in the filters.
 */
export function useMatchResultsBrowser(rows, allOptions = null, searchUrl = null, perPage = MATCH_RESULTS_PER_PAGE) {
    const list = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [agency, setAgency] = useState(ALL);
    const [matchmaker, setMatchmaker] = useState(ALL);
    const [page, setPage] = useState(1);
    const [server, setServer] = useState({ rows: [], total: 0, lastPage: 1, loading: false, error: null });

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(id);
    }, [search]);

    const options = useMemo(() => {
        // Full lists from the server, plus anything only seen in the results (kept so no row is unreachable).
        const agencies = new Map((allOptions?.agencies ?? []).map((a) => [String(a.id), toOption(a)]));
        const matchmakers = new Map((allOptions?.matchmakers ?? []).map((m) => [String(m.id), toOption(m)]));
        list.forEach((match) => {
            if (match.agency?.id && !agencies.has(String(match.agency.id))) agencies.set(String(match.agency.id), toOption(match.agency));
            const assigned = match.assigned_matchmaker;
            if (assigned?.id && !matchmakers.has(String(assigned.id))) matchmakers.set(String(assigned.id), toOption(assigned));
        });

        return {
            agencies: [...agencies.values()].sort(byLabel),
            matchmakers: [...matchmakers.values()].sort(byLabel),
        };
    }, [list, allOptions]);

    const hasCriteria = search.trim() !== '' || agency !== ALL || matchmaker !== ALL;
    const serverCriteria = debouncedSearch.length >= 2 || agency !== ALL || matchmaker !== ALL;
    const serverMode = Boolean(searchUrl) && serverCriteria;

    // Back to the first page whenever the list or a criterion changes.
    useEffect(() => {
        setPage(1);
    }, [list, debouncedSearch, agency, matchmaker]);

    // Whole-base search (also re-run when the compatible list is reloaded, e.g. after a proposition).
    useEffect(() => {
        if (!serverMode) return undefined;
        let cancelled = false;
        setServer((prev) => ({ ...prev, loading: true, error: null }));
        axios
            .get(searchUrl, {
                params: {
                    q: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
                    agency: agency !== ALL ? agency : undefined,
                    matchmaker: matchmaker !== ALL ? matchmaker : undefined,
                    page,
                },
            })
            .then(({ data }) => {
                if (cancelled) return;
                setServer({ rows: data.data ?? [], total: data.total ?? 0, lastPage: data.last_page ?? 1, loading: false, error: null });
            })
            .catch(() => {
                if (cancelled) return;
                setServer({ rows: [], total: 0, lastPage: 1, loading: false, error: 'La recherche a échoué. Réessayez.' });
            });
        return () => {
            cancelled = true;
        };
    }, [serverMode, searchUrl, debouncedSearch, agency, matchmaker, page, list]);

    // Without a search endpoint, the criteria filter the loaded rows.
    const localFiltered = useMemo(() => {
        if (serverMode) return list;
        const term = search.trim().toLowerCase();
        return list.filter((match) => {
            if (
                term &&
                ![match.user?.name, match.user?.username, match.user?.email].some((v) =>
                    String(v ?? '')
                        .toLowerCase()
                        .includes(term),
                )
            ) {
                return false;
            }
            if (agency !== ALL && String(match.agency?.id ?? '') !== agency) return false;
            if (matchmaker === UNASSIGNED && match.assigned_matchmaker?.id) return false;
            if (matchmaker !== ALL && matchmaker !== UNASSIGNED && String(match.assigned_matchmaker?.id ?? '') !== matchmaker) return false;
            return true;
        });
    }, [serverMode, list, search, agency, matchmaker]);

    const compatibleIds = useMemo(() => new Set(list.map((m) => Number(m.user?.id))), [list]);

    let total;
    let totalPages;
    let pageRows;
    if (serverMode) {
        total = server.total;
        totalPages = Math.max(1, server.lastPage);
        pageRows = server.rows.map((row) => ({ ...row, outside_compatible: !compatibleIds.has(Number(row.user?.id)) }));
    } else {
        total = localFiltered.length;
        totalPages = Math.max(1, Math.ceil(total / perPage));
        const current = Math.min(page, totalPages);
        pageRows = localFiltered.slice((current - 1) * perPage, current * perPage);
    }
    const currentPage = Math.min(page, totalPages);

    return {
        search,
        setSearch,
        agency,
        setAgency,
        matchmaker,
        setMatchmaker,
        options,
        hasCriteria,
        clearCriteria: () => {
            setSearch('');
            setDebouncedSearch('');
            setAgency(ALL);
            setMatchmaker(ALL);
        },
        serverMode,
        loading: serverMode && server.loading,
        error: serverMode ? server.error : null,
        total,
        pageRows,
        currentPage,
        setCurrentPage: setPage,
        totalPages,
        from: total === 0 ? 0 : (currentPage - 1) * perPage + 1,
        to: Math.min(currentPage * perPage, total),
    };
}
