import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const ETAT_MATRIMONIAL_OPTIONS = [
    { value: 'celibataire', label: 'Célibataire' },
    { value: 'marie', label: 'Marié(e)' },
    { value: 'divorce', label: 'Divorcé(e)' },
    { value: 'veuf', label: 'Veuf/Veuve' },
];

const SITUATION_SANTE_OPTIONS = [
    { value: 'sante_tres_bonne', label: 'Santé très bonne' },
    { value: 'maladie_chronique', label: 'Maladie chronique' },
    { value: 'personne_handicap', label: 'Personne en situation de handicap' },
    { value: 'non_voyant_malvoyant', label: 'Non voyant / Malvoyant' },
    { value: 'cecite_totale', label: 'مكفوف (Cécité totale)' },
    { value: 'troubles_psychiques', label: 'Troubles psychiques' },
    { value: 'autres', label: 'Autres' },
];

/** "Filtres de recherche" drawer; state comes from useMatchmakingFilters. `gender` is the searched-for profile's gender. */
export default function MatchmakingFiltersSheet({ filtersState, gender }) {
    const {
        filters,
        setFilters,
        appliedFilters,
        isLoading,
        showFilters,
        setShowFilters,
        countryOptions,
        availableCities,
        selectedCountryCodes,
        loadingCountries,
        loadingCities,
        errorCountries,
        handleCountryChange,
        handleApplyFilters,
    } = filtersState;

    return (
        <Sheet
            open={showFilters}
            onOpenChange={(open) => {
                if (!open) setFilters({ ...appliedFilters });
                setShowFilters(open);
            }}
        >
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-4">
                <SheetHeader className="mb-6">
                    <SheetTitle>Filtres de recherche</SheetTitle>
                </SheetHeader>

                <div className="grid grid-cols-1 gap-5">
                        {/* Age Range */}
                        <div className="space-y-2">
                            <Label>Âge minimum</Label>
                            <Input
                                type="number"
                                value={filters.age_min}
                                onChange={(e) => setFilters({ ...filters, age_min: e.target.value })}
                                placeholder="Ex: 25"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Âge maximum</Label>
                            <Input
                                type="number"
                                value={filters.age_max}
                                onChange={(e) => setFilters({ ...filters, age_max: e.target.value })}
                                placeholder="Ex: 35"
                            />
                        </div>

                        {/* Pays recherché - Searchable Multi-Select */}
                        <div className="space-y-2">
                            <Label>Pays recherché</Label>
                            {loadingCountries ? (
                                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                    Chargement des pays...
                                </div>
                            ) : (
                                <SearchableMultiSelect
                                    options={countryOptions}
                                    selectedValues={selectedCountryCodes}
                                    onSelectionChange={handleCountryChange}
                                    placeholder="Sélectionnez les pays"
                                    searchPlaceholder="Search for Location"
                                    emptyMessage="Aucun pays trouvé"
                                />
                            )}
                            {errorCountries && <p className="mt-1 text-xs text-red-500">{errorCountries}</p>}
                        </div>

                        {/* Villes recherchées - Searchable Multi-Select */}
                        <div className="space-y-2">
                            <Label>Villes recherchées</Label>
                            {selectedCountryCodes.length === 0 ? (
                                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                    Veuillez d'abord sélectionner au moins un pays
                                </div>
                            ) : loadingCities ? (
                                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                    Chargement des villes...
                                </div>
                            ) : (
                                <SearchableMultiSelect
                                    options={availableCities}
                                    selectedValues={Array.isArray(filters.villes_recherche) ? filters.villes_recherche : []}
                                    onSelectionChange={(values) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            villes_recherche: values,
                                        }));
                                    }}
                                    placeholder="Sélectionnez les villes"
                                    searchPlaceholder="Search for Location"
                                    emptyMessage="Aucune ville trouvée"
                                />
                            )}
                        </div>

                        {/* Religion */}
                        <div className="space-y-2">
                            <Label>Religion</Label>
                            <Select
                                value={filters.religion || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, religion: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Toutes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes</SelectItem>
                                    <SelectItem value="pratiquant">Pratiquant(e)</SelectItem>
                                    <SelectItem value="non-pratiquant">Non pratiquant(e)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Education */}
                        <div className="space-y-2">
                            <Label>Niveau d'études</Label>
                            <Select
                                value={filters.niveau_etudes || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, niveau_etudes: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="moins-bac">Moins Bac</SelectItem>
                                    <SelectItem value="bac">Bac</SelectItem>
                                    <SelectItem value="bac+2">Bac +2</SelectItem>
                                    <SelectItem value="bac+3-4">Bac +3/4</SelectItem>
                                    <SelectItem value="bac+5-master">Bac +5/Master</SelectItem>
                                    <SelectItem value="bac+8-doctorat">Bac +8/Doctorat</SelectItem>
                                    <SelectItem value="peu-importe">Peu importe</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Employment Status */}
                        <div className="space-y-2">
                            <Label>Situation professionnelle</Label>
                            <Select
                                value={filters.situation_professionnelle || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, situation_professionnelle: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Toutes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes</SelectItem>
                                    <SelectItem value="etudiant">Étudiant</SelectItem>
                                    <SelectItem value="emploi-salarie">Emploi salarié</SelectItem>
                                    <SelectItem value="propre-patron">Propre patron</SelectItem>
                                    <SelectItem value="sans-emploi">Sans emploi</SelectItem>
                                    <SelectItem value="retraite">Retraité</SelectItem>
                                    <SelectItem value="recherche-emploi">À la recherche d'emploi</SelectItem>
                                    <SelectItem value="femme-au-foyer">Femme au foyer</SelectItem>
                                    <SelectItem value="autre">Autre</SelectItem>
                                    <SelectItem value="peu-importe">Peu importe</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Minimum Income */}
                        <div className="space-y-2">
                            <Label>Revenu minimum</Label>
                            <Select
                                value={filters.revenu_minimum || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, revenu_minimum: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="0-2500">0-2500 MAD</SelectItem>
                                    <SelectItem value="2500-5000">2500-5000 MAD</SelectItem>
                                    <SelectItem value="5000-10000">5000-10000 MAD</SelectItem>
                                    <SelectItem value="10000-20000">10000-20000 MAD</SelectItem>
                                    <SelectItem value="20000-50000">20000-50000 MAD</SelectItem>
                                    <SelectItem value="50000+">+50000 MAD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Marital Status - Multi-select */}
                        <div className="space-y-2">
                            <Label>État matrimonial</Label>
                            <SearchableMultiSelect
                                options={ETAT_MATRIMONIAL_OPTIONS}
                                selectedValues={
                                    Array.isArray(filters.etat_matrimonial)
                                        ? filters.etat_matrimonial
                                        : []
                                }
                                onSelectionChange={(values) =>
                                    setFilters({
                                        ...filters,
                                        etat_matrimonial: values,
                                    })
                                }
                                placeholder="Sélectionner..."
                            />
                        </div>

                        {/* Smoker */}
                        <div className="space-y-2">
                            <Label>Fumeur</Label>
                            <Select
                                value={filters.fumeur || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, fumeur: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="oui">Oui</SelectItem>
                                    <SelectItem value="non">Non</SelectItem>
                                    <SelectItem value="parfois">Parfois</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Drinker */}
                        <div className="space-y-2">
                            <Label>Buveur</Label>
                            <Select
                                value={filters.buveur || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, buveur: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="oui">Oui</SelectItem>
                                    <SelectItem value="non">Non</SelectItem>
                                    <SelectItem value="parfois">Parfois</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Has Children */}
                        <div className="space-y-2">
                            <Label>Enfants</Label>
                            <Select
                                value={filters.has_children || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, has_children: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="yes">Avec enfants</SelectItem>
                                    <SelectItem value="no">Sans enfants</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Number of Children */}
                        <div className="space-y-2">
                            <Label>Nombre d'enfants</Label>
                            <Input
                                type="number"
                                value={filters.children_count}
                                onChange={(e) => setFilters({ ...filters, children_count: e.target.value })}
                                placeholder="Ex: 2"
                                min="0"
                                max="20"
                            />
                        </div>

                        {/* Origin */}
                        <div className="space-y-2">
                            <Label>Origine</Label>
                            <Input
                                type="text"
                                value={filters.origine}
                                onChange={(e) => setFilters({ ...filters, origine: e.target.value })}
                                placeholder="Ex: sahraoui"
                            />
                        </div>

                        {/* Country of Residence */}
                        <div className="space-y-2">
                            <Label>Pays de résidence</Label>
                            <Input
                                type="text"
                                value={filters.pays_residence}
                                onChange={(e) => setFilters({ ...filters, pays_residence: e.target.value })}
                                placeholder="Ex: Maroc"
                            />
                        </div>

                        {/* Country of Origin */}
                        <div className="space-y-2">
                            <Label>Pays d'origine</Label>
                            <Input
                                type="text"
                                value={filters.pays_origine}
                                onChange={(e) => setFilters({ ...filters, pays_origine: e.target.value })}
                                placeholder="Ex: Maroc"
                            />
                        </div>

                        {/* City of Residence */}
                        <div className="space-y-2">
                            <Label>Ville de résidence</Label>
                            <Input
                                type="text"
                                value={filters.ville_residence}
                                onChange={(e) => setFilters({ ...filters, ville_residence: e.target.value })}
                                placeholder="Ex: Casablanca"
                            />
                        </div>

                        {/* City of Origin */}
                        <div className="space-y-2">
                            <Label>Ville d'origine</Label>
                            <Input
                                type="text"
                                value={filters.ville_origine}
                                onChange={(e) => setFilters({ ...filters, ville_origine: e.target.value })}
                                placeholder="Ex: Casablanca"
                            />
                        </div>

                        {/* Housing */}
                        <div className="space-y-2">
                            <Label>Logement</Label>
                            <Input
                                type="text"
                                value={filters.logement}
                                onChange={(e) => setFilters({ ...filters, logement: e.target.value })}
                                placeholder="Ex: familial"
                            />
                        </div>

                        {/* Health Situation - Multi-select */}
                        <div className="space-y-2">
                            <Label>Situation de santé</Label>
                            <SearchableMultiSelect
                                options={SITUATION_SANTE_OPTIONS}
                                selectedValues={
                                    Array.isArray(filters.situation_sante)
                                        ? filters.situation_sante
                                        : []
                                }
                                onSelectionChange={(values) =>
                                    setFilters({
                                        ...filters,
                                        situation_sante: values,
                                    })
                                }
                                placeholder="Sélectionner..."
                            />
                        </div>

                        {/* Motorized */}
                        <div className="space-y-2">
                            <Label>Motorisé</Label>
                            <Select
                                value={filters.motorise || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, motorise: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="oui">Oui</SelectItem>
                                    <SelectItem value="non">Non</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sport */}
                        <div className="space-y-2">
                            <Label>Sport</Label>
                            <Select
                                value={filters.sport || 'all'}
                                onValueChange={(value) => setFilters({ ...filters, sport: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous</SelectItem>
                                    <SelectItem value="oui">Oui</SelectItem>
                                    <SelectItem value="non">Non</SelectItem>
                                    <SelectItem value="parfois">Parfois</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sector */}
                        <div className="space-y-2">
                            <Label>Secteur d'activité</Label>
                            <Input
                                type="text"
                                value={filters.secteur}
                                onChange={(e) => setFilters({ ...filters, secteur: e.target.value })}
                                placeholder="Ex: informatique-telecoms"
                            />
                        </div>

                        {/* Female-specific filters - only show when looking for female profiles */}
                        {gender === 'male' && (
                            <>
                                {/* Hijab Choice (for women) */}
                                <div className="space-y-2">
                                    <Label>Choix de hijab</Label>
                                    <Select
                                        value={filters.hijab_choice || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, hijab_choice: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="voile">Voile</SelectItem>
                                            <SelectItem value="non_voile">Non voilé</SelectItem>
                                            <SelectItem value="niqab">Niqab</SelectItem>
                                            <SelectItem value="idea_niqab">Idée niqab</SelectItem>
                                            <SelectItem value="idea_hijab">Idée hijab</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Veil (for women) */}
                                <div className="space-y-2">
                                    <Label>Voile</Label>
                                    <Select
                                        value={filters.veil || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, veil: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="veiled">Voilée</SelectItem>
                                            <SelectItem value="non_veiled">Non voilée</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Niqab Acceptance (for women) */}
                                <div className="space-y-2">
                                    <Label>Acceptation du niqab</Label>
                                    <Select
                                        value={filters.niqab_acceptance || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, niqab_acceptance: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="yes">Oui</SelectItem>
                                            <SelectItem value="no">Non</SelectItem>
                                            <SelectItem value="to_discuss">À discuter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Polygamy (for women) */}
                                <div className="space-y-2">
                                    <Label>Polygamie</Label>
                                    <Select
                                        value={filters.polygamy || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, polygamy: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="accepted">Acceptée</SelectItem>
                                            <SelectItem value="not_accepted">Non acceptée</SelectItem>
                                            <SelectItem value="to_discuss">À discuter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Foreign Marriage (for women) */}
                                <div className="space-y-2">
                                    <Label>Mariage avec une personne étrangère</Label>
                                    <Select
                                        value={filters.foreign_marriage || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, foreign_marriage: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="yes">Oui</SelectItem>
                                            <SelectItem value="no">Non</SelectItem>
                                            <SelectItem value="maybe_discuss">Peut-être / À discuter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Work After Marriage (for women) */}
                                <div className="space-y-2">
                                    <Label>Travail après le mariage</Label>
                                    <Select
                                        value={filters.work_after_marriage || 'all'}
                                        onValueChange={(value) => setFilters({ ...filters, work_after_marriage: value === 'all' ? '' : value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tous" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tous</SelectItem>
                                            <SelectItem value="yes">Oui</SelectItem>
                                            <SelectItem value="no">Non</SelectItem>
                                            <SelectItem value="maybe">Peut-être</SelectItem>
                                            <SelectItem value="depending_situation">Selon la situation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                </div>

                <div className="mt-6 flex justify-end border-t border-border/50 pt-6">
                    <Button
                        onClick={handleApplyFilters}
                        disabled={isLoading}
                        className="rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    >
                        {isLoading ? 'Application...' : 'Appliquer les filtres'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
