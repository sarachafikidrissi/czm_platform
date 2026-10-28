import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@inertiajs/react';
import {
    ArrowRightLeft,
    BadgeCheck,
    Ban,
    Check,
    ChevronDown,
    Clock,
    CreditCard,
    FileText,
    Heart,
    Lock,
    MoreHorizontal,
    Pencil,
    Phone,
    Power,
    RefreshCw,
    Send,
    CalendarPlus,
    MessageCircle,
    User,
    UserPlus,
    X,
    Coffee,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Action catalogue for the staff profile header (labels from the CZM Profile Hub design).
// Permissions never come from here: visible / allowed / reason are sent by the server (profileAbilities).
const ACTIONS = {
    completerProfil: { group: 'cycle', labelKey: 'profile.completeProfileAction', icon: Pencil },
    validerProspect: { group: 'cycle', labelKey: 'profile.validateProspectAction', icon: Check },
    reactiver: { group: 'cycle', label: 'Réactiver le prospect', icon: RefreshCw },
    activer: { group: 'cycle', label: 'Activer le compte', icon: Power },
    rappeler: { group: 'cycle', label: 'Rappeler le client', icon: Phone },
    transferer: { group: 'cycle', label: 'Transférer le dossier', icon: ArrowRightLeft },
    desactiver: { group: 'cycle', label: 'Désactiver le compte', icon: Ban, danger: true },
    proposer: { group: 'match', label: 'Proposer un match', icon: Heart },
    demander: { group: 'match', labelKey: 'profile.requestPropositionAction', icon: Send },
    proposerDemande: { group: 'match', labelKey: 'profile.requestProposeButton', icon: Heart },
    repondreProposition: { group: 'match', labelKey: 'profile.answerPropositionAction', icon: MessageCircle },
    creerRdv: { group: 'match', labelKey: 'profile.createRdvAction', icon: CalendarPlus },
    creerFacture: { group: 'fact', label: 'Créer une facture', icon: CreditCard },
    marquerClient: { group: 'fact', label: 'Marquer comme client', icon: BadgeCheck },
    modifier: { group: 'dossier', label: 'Modifier le profil', icon: Pencil },
    historique: { group: 'dossier', label: "Historique d'activité", icon: FileText },
};

const GROUPS = [
    { key: 'cycle', label: 'Cycle de vie' },
    { key: 'match', label: 'Matchmaking' },
    { key: 'fact', label: 'Facturation' },
    { key: 'dossier', label: 'Dossier' },
];

const STAGES = {
    prospect: { label: 'Prospect', icon: User, className: 'bg-[#eceef2] text-[#363b47]' },
    member: { label: 'Membre', icon: BadgeCheck, className: 'bg-[#15171c] text-white' },
    client: { label: 'Client', icon: BadgeCheck, className: 'bg-gradient-to-br from-[#a0541a] to-[#6b2e08] text-white' },
    client_expire: { label: 'Client expiré', icon: Clock, className: 'bg-white text-[#7a3b10] ring-[1.5px] ring-inset ring-[#d6b294]' },
};

function actionLabel(key, user, hasBills, t) {
    if (ACTIONS[key].labelKey) return t(ACTIONS[key].labelKey);
    if (key === 'creerFacture' && user?.status === 'client_expire') return 'Renouveler (facture)';
    if (key === 'creerFacture' && !hasBills) return 'Créer la facture';
    return ACTIONS[key].label;
}

function Pill({ className, icon: Icon, children }) {
    return (
        <span className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-extrabold ${className}`}>
            {Icon && <Icon className="h-[13px] w-[13px]" strokeWidth={2.6} aria-hidden />}
            {children}
        </span>
    );
}

// Proposition / RDV / Match pills next to the member status, linked to their details page when allowed.
function StatusLinkPills({ links, t }) {
    if (!links) return null;
    const pills = [];

    if (links.proposition) {
        const accepted = ['interested', 'accepted'].includes(links.proposition.status);
        pills.push({
            key: 'proposition',
            url: links.proposition.url,
            className: accepted ? 'bg-[#e6f5eb] text-[#1d7440]' : 'bg-[#fff3d6] text-[#7f4d00]',
            icon: Heart,
            label: t(accepted ? 'profile.statusPropositionAccepted' : 'profile.statusPropositionPending'),
        });
    }
    if (links.rdv) {
        const match = links.rdv.status === 'reussi';
        pills.push({
            key: 'rdv',
            url: links.rdv.url,
            className: match ? 'bg-[#890505] text-white' : 'bg-[#fdf2f2] text-[#890505] ring-1 ring-inset ring-[#f3c9c9]',
            icon: match ? BadgeCheck : Coffee,
            label: t(match ? 'profile.statusMatch' : 'profile.statusRdvInProgress'),
        });
    }

    return pills.map((pill) =>
        pill.url ? (
            <Link key={pill.key} href={pill.url} className="rounded-full hover:opacity-85 focus-visible:outline-2 focus-visible:outline-[#890505]">
                <Pill className={`${pill.className} underline-offset-2 hover:underline`} icon={pill.icon}>
                    {pill.label}
                </Pill>
            </Link>
        ) : (
            <Pill key={pill.key} className={pill.className} icon={pill.icon}>
                {pill.label}
            </Pill>
        ),
    );
}

function initialsOf(name) {
    return (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('fr-FR');
}

function formatDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.toLocaleDateString('fr-FR')}, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function OwnerChip({ abilities, authUserId }) {
    const owner = abilities.owner;
    const isMe = abilities.relationship === 'owner' || (owner && Number(owner.id) === Number(authUserId));

    if (isMe) {
        return (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#e6f5eb] py-1 pl-1 pr-3.5 text-[13.5px] font-extrabold text-[#1d7440]">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#1d7440] text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                Suivi par vous
            </span>
        );
    }

    if (owner) {
        return (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#eef0f4] py-1 pl-1 pr-3.5 text-[13.5px] font-extrabold text-[#2f3440]">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#2f3440] text-[10.5px] font-black text-white">
                    {initialsOf(owner.name)}
                </span>
                Suivi par {owner.name}
                {owner.agency ? ` (${owner.agency})` : ''}
            </span>
        );
    }

    return (
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 text-[13.5px] font-extrabold text-[#7f4d00] ring-[1.5px] ring-inset ring-[#e2bd72]">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#fff3d6]">
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
            </span>
            Non assigné
        </span>
    );
}

function StatCard({ icon: Icon, label, value, sub, small, warn, onClick }) {
    // Clickable cards open the matching profile tab or page.
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`flex min-w-0 flex-col gap-0.5 rounded-[14px] border border-[#e3e6ea] px-[15px] py-[13px] text-start ${
                onClick ? 'cursor-pointer transition-colors hover:border-[#e8b4b4] hover:bg-[#fdf2f2] focus-visible:outline-2 focus-visible:outline-[#890505]' : ''
            }`}
        >
            <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#5d6372]">
                <Icon className="h-[15px] w-[15px]" aria-hidden />
                {label}
            </span>
            <span
                className={`font-extrabold tabular-nums ${small ? 'text-base leading-relaxed' : 'text-[26px] leading-tight'} ${warn ? 'text-[#7f4d00]' : ''}`}
            >
                {value}
            </span>
            <span className="flex items-center gap-1 text-[12.5px] font-semibold leading-snug text-[#5d6372]">{sub}</span>
        </Tag>
    );
}

function Stats({ stats, abilities, onOpen }) {
    if (!stats) return null;
    const p = stats.propositions;
    const r = stats.rdv;
    const b = stats.bills;
    const last = stats.last_activity;

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
                icon={Heart}
                label="Propositions"
                onClick={() => onOpen('propositions')}
                value={p.total}
                sub={p.total ? `${p.active} en cours · ${p.accepted} acceptée · ${p.refused} refusée` : 'Aucune proposition'}
            />
            <StatCard
                icon={Coffee}
                label="RDV"
                onClick={() => onOpen('rdv')}
                value={r.total}
                sub={r.total ? `${r.en_cours} à venir · ${r.reussi} réussi · ${r.echec} échec` : 'Aucun RDV'}
            />
            {b ? (
                <StatCard
                    icon={CreditCard}
                    label="Factures"
                    small
                    onClick={() => onOpen('orders')}
                    warn={b.unpaid > 0}
                    value={b.unpaid ? `${b.unpaid} impayée${b.unpaid > 1 ? 's' : ''}` : b.total ? 'À jour' : 'Aucune'}
                    sub={
                        b.total
                            ? `${b.total} facture${b.total > 1 ? 's' : ''}${b.last_date ? ` · dernière le ${formatDate(b.last_date)}` : ''}`
                            : 'Aucune facture émise'
                    }
                />
            ) : (
                <StatCard
                    icon={CreditCard}
                    label="Factures"
                    small
                    value="Non visible"
                    sub={
                        <>
                            <Lock className="h-3 w-3" aria-hidden />
                            {abilities.owner ? `Réservé à ${abilities.owner.name}` : 'Réservé au matchmaker'}
                        </>
                    }
                />
            )}
            <StatCard
                icon={Clock}
                label="Dernière activité"
                small
                onClick={() => onOpen('historique')}
                value={last ? formatDateTime(last.at) : 'Aucune'}
                sub={last ? [last.description, last.by].filter(Boolean).join(' · ') : 'Aucune activité enregistrée'}
            />
        </div>
    );
}

function MainButton({ actionKey, ability, label, onClick }) {
    const Icon = ACTIONS[actionKey].icon;
    const button = (
        <Button
            type="button"
            aria-disabled={!ability.allowed || undefined}
            onClick={(e) => {
                if (!ability.allowed) {
                    e.preventDefault();
                    return;
                }
                onClick();
            }}
            className={`h-11 gap-2.5 rounded-xl px-[18px] text-[15px] font-bold ${
                ability.allowed
                    ? 'bg-[#890505] text-white hover:bg-[#6d0404]'
                    : 'cursor-not-allowed border border-[#e1e4e8] bg-[#f0f1f4] text-[#646a78] shadow-none hover:bg-[#f0f1f4]'
            }`}
        >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
        </Button>
    );

    if (ability.allowed || !ability.reason) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{ability.reason}</TooltipContent>
        </Tooltip>
    );
}

const REQUEST_LINK_LABELS = {
    pending: 'profile.requestLinkPending',
    accepted: 'profile.requestLinkAccepted',
    rejected: 'profile.requestLinkRejected',
};

// Requests other matchmakers sent me: "Demande reçue de <matchmaker> — avec <profil>".
const RECEIVED_LINK_LABELS = {
    pending: 'profile.receivedLinkPending',
    accepted: 'profile.receivedLinkAccepted',
    rejected: 'profile.receivedLinkRejected',
};

// "Demande acceptée — avec <profil>" lines: counterpart picture + link to its profile, "Proposer" when accepted.
function RequestLinks({ links, onPropose, onRespond, t }) {
    if (!links?.length) return null;

    return (
        <div className="flex flex-col gap-2 border-t border-[#eef0f3] pt-4">
            <span className="text-[11px] font-black uppercase tracking-[.07em] text-[#5d6372]">{t('profile.requestLinksTitle')}</span>
            {links.map((link) => {
                const person = link.counterpart;
                const tone =
                    link.status === 'accepted' ? 'text-[#1d7440]' : link.status === 'rejected' ? 'text-[#a3201a]' : 'text-[#7f4d00]';
                return (
                    <div key={link.id} className="flex flex-wrap items-center gap-3">
                        {person?.photo ? (
                            <img src={person.photo} alt="" className="h-9 w-9 flex-none rounded-full object-cover" />
                        ) : (
                            <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f6e3e1] text-xs font-black text-[#7a1712]">
                                {initialsOf(person?.name)}
                            </span>
                        )}
                        <span className={`min-w-0 flex-1 text-sm font-bold ${tone}`}>
                            {link.direction === 'received'
                                ? t(RECEIVED_LINK_LABELS[link.status] || RECEIVED_LINK_LABELS.pending, {
                                      matchmaker: link.from_matchmaker?.name || '',
                                  })
                                : t(REQUEST_LINK_LABELS[link.status] || REQUEST_LINK_LABELS.pending)}{' '}
                            {person?.username ? (
                                <Link href={`/profile/${person.username}`} className="text-[#890505] underline-offset-2 hover:underline">
                                    {person.name}
                                </Link>
                            ) : (
                                <span className="text-[#1d2230]">{person?.name}</span>
                            )}
                        </span>
                        {link.can_respond && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onRespond(link)}
                                className="gap-1.5 rounded-[10px] border-[#890505] text-[#890505] hover:bg-[#fdf2f2]"
                            >
                                <Send className="h-4 w-4" aria-hidden />
                                {t('profile.respondRequestButton')}
                            </Button>
                        )}
                        {link.can_propose && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onPropose(link)}
                                className="gap-1.5 rounded-[10px] bg-[#890505] text-white hover:bg-[#6d0404]"
                            >
                                <Heart className="h-4 w-4" aria-hidden />
                                {t('profile.requestProposeButton')}
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function OwnerCard({ user, abilities }) {
    const owner = abilities.owner;
    const rejected = user?.status === 'prospect' && Boolean(user?.rejection_reason);
    const deactivated = user?.profile?.account_status === 'desactivated';

    let title;
    let text;
    let Icon = Lock;
    let iconClass = 'bg-[#eef0f4] text-[#2f3440]';

    if ((rejected || deactivated) && abilities.relationship !== 'owner') {
        Icon = RefreshCw;
        iconClass = 'bg-[#fdf2f2] text-[#890505]';
        title = deactivated ? 'Compte désactivé' : 'Profil rejeté';
        text = `${owner ? `Suivi auparavant par ${owner.name}${owner.agency ? `, ${owner.agency}` : ''}. ` : ''}Tout matchmaker peut ${
            deactivated ? 'activer ce compte' : 'réactiver ce prospect'
        } et en devenir responsable.`;
    } else if (abilities.relationship === 'unassigned') {
        Icon = UserPlus;
        iconClass = 'bg-[#fff3d6] text-[#7f4d00]';
        title = 'Profil non assigné';
        text = 'Aucun matchmaker ne suit ce profil pour le moment.';
    } else if (abilities.relationship === 'other' && owner && !abilities.actions?.transferer?.allowed) {
        title = `Suivi par ${owner.name}${owner.agency ? ` · ${owner.agency}` : ''}`;
        text = `Profil en lecture seule. Coordonnées et factures restent réservées à ${owner.name}.`;
    } else {
        return null;
    }

    return (
        <section aria-label="Responsable du profil" className="flex items-start gap-3.5 rounded-[18px] border border-[#eef0f3] bg-white px-5 py-4 shadow-sm">
            <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
                <h2 className="text-[15.5px] font-extrabold">{title}</h2>
                <p className="mt-0.5 font-semibold leading-relaxed text-[#3d4352]">{text}</p>
            </div>
        </section>
    );
}

export function hasOwnershipEffect(abilities, key) {
    return Boolean(abilities?.actions?.[key]?.effects?.includes('assigns_to_me'));
}

export function OwnershipEffectNote() {
    return (
        <div role="note" className="flex items-start gap-2.5 rounded-xl border border-[#f3c9c9] bg-[#fdf2f2] px-3.5 py-3 text-[13.5px] font-extrabold text-[#6d0404]">
            <UserPlus className="h-[18px] w-[18px] flex-none" aria-hidden />
            Vous deviendrez responsable de ce profil.
        </div>
    );
}

export default function StaffProfileHeader({ user, displayName, avatarUrl, packName, abilities, stats, authUserId, onAction }) {
    const { t } = useTranslation();
    const [confirmClientOpen, setConfirmClientOpen] = useState(false);

    if (!abilities) return null;

    const actions = abilities.actions || {};
    const main = abilities.main && actions[abilities.main]?.visible ? abilities.main : null;
    const hasBills = Boolean(stats?.bills?.total);
    const stage = STAGES[user?.status] || STAGES.prospect;
    const deactivated = user?.profile?.account_status === 'desactivated';
    const rejected = user?.status === 'prospect' && Boolean(user?.rejection_reason);
    const age = user?.profile?.date_naissance ? Math.floor((Date.now() - new Date(user.profile.date_naissance).getTime()) / 31557600000) : null;
    const city = user?.profile?.ville_residence || user?.city;
    const meta = [age ? `${age} ans` : null, city, packName].filter(Boolean).join(' · ');

    const menuGroups = GROUPS.map((group) => ({
        ...group,
        // Only actions the viewer can use; locked ones are not listed (the main button still explains its own lock).
        keys: Object.keys(ACTIONS).filter((key) => ACTIONS[key].group === group.key && key !== main && actions[key]?.allowed),
    })).filter((group) => group.keys.length > 0);

    const requestLinks = abilities.request_links || [];
    // On another matchmaker's profile: my latest request towards it (received requests have their own lines).
    const latestRequestHere =
        abilities.relationship !== 'owner' ? requestLinks.find((link) => link.direction === 'sent') ?? null : null;

    const run = (key) => {
        if (!actions[key]?.allowed) return;
        if (key === 'marquerClient') {
            setConfirmClientOpen(true);
            return;
        }
        if (key === 'proposerDemande') {
            onAction(key, requestLinks.find((link) => link.can_propose));
            return;
        }
        onAction(key);
    };

    return (
        <>
            <section aria-label="En-tête du profil" className="flex flex-col gap-5 rounded-[18px] border border-[#eef0f3] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3.5">
                    <div className="flex min-w-0 items-center gap-4">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="h-16 w-16 flex-none rounded-full object-cover" />
                        ) : (
                            <div aria-hidden className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[#f6e3e1] text-[22px] font-black text-[#7a1712]">
                                {initialsOf(displayName)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-2xl font-extrabold leading-tight">{displayName}</h1>
                            {meta && <div className="mt-0.5 text-sm font-semibold text-[#5d6372]">{meta}</div>}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <Pill className={stage.className} icon={stage.icon}>
                                    {stage.label}
                                </Pill>
                                <StatusLinkPills links={abilities.status_links} t={t} />
                                {deactivated ? (
                                    <Pill className="bg-[#2f3340] text-white" icon={Ban}>
                                        Désactivé
                                    </Pill>
                                ) : rejected ? (
                                    <Pill className="bg-[#fdf0ef] text-[#a3201a] ring-1 ring-inset ring-[#efc6c2]" icon={X}>
                                        Rejeté
                                    </Pill>
                                ) : null}
                                {user?.status === 'prospect' && Boolean(user?.is_traite) && (
                                    <Pill className="bg-[#e6f5eb] text-[#1d7440]" icon={Check}>
                                        Traité
                                    </Pill>
                                )}
                                {latestRequestHere?.status === 'accepted' ? (
                                    <Pill className="bg-[#e6f5eb] text-[#1d7440]" icon={Check}>
                                        {t('profile.requestPillAccepted')}
                                    </Pill>
                                ) : latestRequestHere?.status === 'rejected' ? (
                                    <Pill className="bg-[#fdf0ef] text-[#a3201a] ring-1 ring-inset ring-[#efc6c2]" icon={X}>
                                        {t('profile.requestPillRejected')}
                                    </Pill>
                                ) : abilities.request_pending ? (
                                    <Pill className="bg-[#fff3d6] text-[#7f4d00]" icon={Clock}>
                                        {t('profile.requestPropositionPending')}
                                    </Pill>
                                ) : null}
                                {/* « À rappeler » is the owner's follow-up marker: only for the profile's own matchmaker. */}
                                {abilities.relationship === 'owner' && Boolean(user?.to_rappeler) && (
                                    <Pill className="bg-[#fff3d6] text-[#7f4d00]" icon={Phone}>
                                        À rappeler
                                    </Pill>
                                )}
                            </div>
                        </div>
                    </div>
                    <OwnerChip abilities={abilities} authUserId={authUserId} />
                </div>

                <Stats stats={stats} abilities={abilities} onOpen={(target) => onAction('ouvrirOnglet', target)} />

                {(main || menuGroups.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        {main && (
                            <MainButton actionKey={main} ability={actions[main]} label={actionLabel(main, user, hasBills, t)} onClick={() => run(main)} />
                        )}
                        {menuGroups.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" className="h-11 gap-2.5 rounded-xl px-[18px] text-[15px] font-bold">
                                        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden />
                                        Autres actions
                                        <ChevronDown className="h-4 w-4" aria-hidden />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[330px] rounded-[14px] p-1.5">
                                    {menuGroups.map((group, index) => (
                                        <Fragment key={group.key}>
                                            {index > 0 && <DropdownMenuSeparator />}
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel className="px-2.5 pb-1 pt-2 text-[11px] font-black uppercase tracking-[.07em] text-[#5d6372]">
                                                    {group.label}
                                                </DropdownMenuLabel>
                                                {group.keys.map((key) => {
                                                    const ability = actions[key];
                                                    const Icon = ability.allowed ? ACTIONS[key].icon : Lock;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={key}
                                                            aria-disabled={!ability.allowed || undefined}
                                                            title={ability.reason || undefined}
                                                            onSelect={(e) => {
                                                                if (!ability.allowed) {
                                                                    e.preventDefault();
                                                                    return;
                                                                }
                                                                run(key);
                                                            }}
                                                            className={`items-start gap-2.5 rounded-[9px] px-2.5 py-2 text-sm font-bold ${
                                                                !ability.allowed
                                                                    ? 'cursor-not-allowed text-[#646a78] focus:bg-transparent'
                                                                    : ACTIONS[key].danger
                                                                      ? 'text-[#a3201a] focus:text-[#a3201a]'
                                                                      : ''
                                                            }`}
                                                        >
                                                            <Icon
                                                                className={`mt-0.5 h-[17px] w-[17px] ${
                                                                    !ability.allowed ? 'text-[#9aa0ab]' : ACTIONS[key].danger ? 'text-[#a3201a]' : 'text-[#3d4352]'
                                                                }`}
                                                                aria-hidden
                                                            />
                                                            <span className="flex min-w-0 flex-1 flex-col">
                                                                <span>{actionLabel(key, user, hasBills, t)}</span>
                                                                {ability.reason && <span className="mt-0.5 text-xs font-bold text-[#646a78]">{ability.reason}</span>}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </DropdownMenuGroup>
                                        </Fragment>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )}

                <RequestLinks
                    links={requestLinks}
                    onPropose={(link) => onAction('proposerDemande', link)}
                    onRespond={(link) => onAction('repondreDemande', link)}
                    t={t}
                />
            </section>

            <OwnerCard user={user} abilities={abilities} />

            <Dialog open={confirmClientOpen} onOpenChange={setConfirmClientOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Marquer comme client</DialogTitle>
                        <DialogDescription>La facture en attente est marquée payée et l'abonnement démarre aujourd'hui.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setConfirmClientOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            className="bg-[#890505] text-white hover:bg-[#6d0404]"
                            onClick={() => {
                                setConfirmClientOpen(false);
                                onAction('marquerClient');
                            }}
                        >
                            <BadgeCheck className="mr-2 h-4 w-4" aria-hidden />
                            Marquer comme client
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
