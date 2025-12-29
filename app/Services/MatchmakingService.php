<?php

namespace App\Services;

use App\Models\User;
use App\Models\Profile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MatchmakingService
{
    /**
     * Get eligible prospects for matchmaking entry page
     * These are users ready to be matched (User A candidates)
     * Includes members and clients assigned to the matchmaker
     */
    public function getEligibleProspects($matchmakerId = null, $agencyId = null)
    {
        $query = User::role('user')
            ->whereIn('status', ['member', 'client', 'client_expire'])
            ->whereHas('profile', function($q) {
                // Require completed profile for matchmaking
                $q->where('is_completed', true);
                // Don't require active account_status - show all members/clients
                // The matchmaking process will handle account_status validation
            })
            ->with(['profile', 'assignedMatchmaker']);

        // Filter by matchmaker assignment if provided
        // Match the same logic as validatedProspects: users they validated OR assigned to them
        if ($matchmakerId) {
            $query->where(function($q) use ($matchmakerId) {
                $q->where('approved_by', $matchmakerId)
                  ->orWhere('assigned_matchmaker_id', $matchmakerId);
            });
        }

        // Filter by agency if provided (for managers)
        if ($agencyId && !$matchmakerId) {
            // For managers, show all members/clients from their agency
            // Get all matchmaker IDs in the manager's agency
            $matchmakerIds = User::role('matchmaker')
                ->where('agency_id', $agencyId)
                ->pluck('id')
                ->toArray();
            
            $query->where(function($q) use ($agencyId, $matchmakerIds) {
                // Members from their agency
                $q->where('agency_id', $agencyId)
                  // OR members assigned to matchmakers in their agency
                  ->orWhere(function($subQ) use ($matchmakerIds) {
                      if (!empty($matchmakerIds)) {
                          $subQ->whereIn('assigned_matchmaker_id', $matchmakerIds);
                      }
                  });
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Perform smart matchmaking for User A
     * 
     * @param int $userAId The ID of User A
     * @param array $filterOverrides Optional filter overrides from matchmaker
     * @param bool $useAndLogic If true, manual filters use AND logic (all must match). If false, uses OR logic (at least one must match)
     * @return array Contains matches, defaultFilters, and appliedFilters
     */
    public function findMatches($userAId, $filterOverrides = [], $useAndLogic = false)
    {
        $userA = User::with('profile')->findOrFail($userAId);
        $profileA = $userA->profile;

        if (!$profileA || !$profileA->is_completed) {
            throw new \Exception('User A profile is not completed');
        }

        // Determine target gender
        $targetGender = $userA->gender === 'male' ? 'female' : 'male';

        // Calculate User A's age
        $userAAge = $profileA->date_naissance 
            ? Carbon::parse($profileA->date_naissance)->age 
            : null;

        // Initialize default filters from User A's preferences
        $defaultFilters = $this->getDefaultFilters($profileA, $userAAge);

        // Merge with overrides (overrides take precedence)
        $appliedFilters = array_merge($defaultFilters, $filterOverrides);

        // Build base query with hard filters (always applied)
        $query = User::role('user')
            ->where('id', '!=', $userAId)
            ->where('gender', $targetGender)
            ->whereHas('profile', function($q) {
                $q->where('is_completed', true)
                  ->where('account_status', 'active');
            })
            ->with(['profile', 'assignedMatchmaker']);

        // Apply dynamic filters with mixed logic:
        // - Unchanged/default filters: OR logic (at least one must match)
        // - Manually changed filters: AND logic (all must match)
        // - Final result: (default OR filters) AND (manual AND filters)
        $query = $this->applyFiltersMixed($query, $defaultFilters, $filterOverrides, $userAAge, $profileA);

        // Get candidates
        $candidates = $query->get();
        
        // Debug: Log candidate count
        Log::info('Matchmaking candidates found', [
            'count' => $candidates->count(),
            'userAId' => $userAId,
            'hasFilterOverrides' => !empty($filterOverrides)
        ]);

        // Score and rank candidates
        $matches = $this->scoreAndRankMatches($candidates, $profileA, $userAAge);
        
        // Debug: Log final matches count
        Log::info('Matchmaking final matches', [
            'count' => count($matches)
        ]);

        return [
            'matches' => $matches,
            'defaultFilters' => $defaultFilters,
            'appliedFilters' => $appliedFilters,
            'userA' => $userA,
        ];
    }

    /**
     * Get default filters from User A's preferences
     */
    private function getDefaultFilters($profileA, $userAAge)
    {
        $filters = [];

        // Age range
        if ($userAAge) {
            if ($profileA->age_minimum && $profileA->age_maximum) {
                // Use User A's age_minimum and age_maximum directly (absolute ages, not difference)
                $filters['age_min'] = $profileA->age_minimum;
                $filters['age_max'] = $profileA->age_maximum;
            } else {
                // Default age range if no preference (10 years on each side)
                $filters['age_min'] = max(18, $userAAge - 10);
                $filters['age_max'] = $userAAge + 10;
            }
        }

        // Country
        if ($profileA->pays_recherche) {
            $filters['pays_recherche'] = is_array($profileA->pays_recherche) 
                ? $profileA->pays_recherche 
                : [$profileA->pays_recherche];
        }

        // Cities
        if ($profileA->villes_recherche && is_array($profileA->villes_recherche)) {
            $filters['villes_recherche'] = $profileA->villes_recherche;
        }

        // Religion
        if ($profileA->religion_recherche) {
            $filters['religion'] = $profileA->religion_recherche;
        }

        // Minimum income
        if ($profileA->revenu_minimum) {
            $filters['revenu_minimum'] = $profileA->revenu_minimum;
        }

        // Education level
        if ($profileA->niveau_etudes_recherche) {
            $filters['niveau_etudes'] = $profileA->niveau_etudes_recherche;
        }

        // Employment status
        if ($profileA->statut_emploi_recherche) {
            $filters['situation_professionnelle'] = $profileA->statut_emploi_recherche;
        }

        // Marital status
        if ($profileA->situation_matrimoniale_recherche) {
            $filters['etat_matrimonial'] = is_array($profileA->situation_matrimoniale_recherche)
                ? $profileA->situation_matrimoniale_recherche
                : [$profileA->situation_matrimoniale_recherche];
        }

        return $filters;
    }

    /**
     * Apply filters with mixed logic:
     * - Changed filters: AND logic (ALL must match)
     * - Unchanged filters: OR logic (AT LEAST ONE must match)
     * - Final: (ALL changed filters AND) AND (AT LEAST ONE unchanged filter OR)
     * 
     * If no filters are changed, return default result (all profiles matching defaults with OR logic)
     */
    private function applyFiltersMixed($query, $defaultFilters, $filterOverrides, $userAAge, $profileA = null)
    {
        // Step 1: Identify which filters have changed vs unchanged
        $changedFilters = [];
        $unchangedFilters = [];
        
        // Compare each default filter with its override value
        foreach ($defaultFilters as $key => $defaultValue) {
            if (isset($filterOverrides[$key])) {
                $overrideValue = $filterOverrides[$key];
                
                // Skip if override value is empty (not provided by user)
                if ($this->isEmptyValue($overrideValue)) {
                    // Empty override means user didn't change it, keep as unchanged
                    $unchangedFilters[$key] = $defaultValue;
                    continue;
                }
                
                // Detect if filter value has meaningfully changed
                $isChanged = $this->isFilterValueChanged($defaultValue, $overrideValue);
                if ($isChanged) {
                    $changedFilters[$key] = $overrideValue;
                    Log::debug("Filter $key: CHANGED", [
                        'default' => $defaultValue,
                        'override' => $overrideValue,
                        'defaultType' => gettype($defaultValue),
                        'overrideType' => gettype($overrideValue)
                    ]);
                } else {
                    // Value is the same, keep as unchanged
                    $unchangedFilters[$key] = $defaultValue;
                    Log::debug("Filter $key: UNCHANGED", [
                        'value' => $defaultValue
                    ]);
                }
            } else {
                // No override provided, filter remains unchanged
                $unchangedFilters[$key] = $defaultValue;
            }
        }
        
        // Step 2: Include any new filters (not in defaults) as changed filters
        // But skip empty values (they're not meaningful changes)
        foreach ($filterOverrides as $key => $value) {
            if (!isset($defaultFilters[$key]) && !$this->isEmptyValue($value)) {
                // This is a new filter that wasn't in defaults, treat as changed
                $changedFilters[$key] = $value;
            }
        }
        
        // Step 3: Apply filtering logic based on what changed
        // If no filters changed, use default OR logic for all filters
        if (empty($changedFilters)) {
            // No filters changed - return default result with OR logic
            if (!empty($unchangedFilters)) {
                return $this->applyFiltersWithOr($query, $unchangedFilters, $userAAge, $profileA);
            }
            // No filters at all, return query as-is (shows all profiles)
            return $query;
        }
        
        // Step 4: Apply mixed logic: (ALL changed AND) AND (AT LEAST ONE unchanged OR)
        // Debug logging
        Log::info('Matchmaking Filter Debug', [
            'changedFilters' => $changedFilters,
            'unchangedFilters' => array_keys($unchangedFilters),
            'changedCount' => count($changedFilters),
            'unchangedCount' => count($unchangedFilters),
        ]);
        
        // First, apply unchanged filters with OR logic (at least one must match)
        if (!empty($unchangedFilters)) {
            $query = $this->applyFiltersWithOr($query, $unchangedFilters, $userAAge, $profileA);
            Log::info('After applying OR filters', [
                'sql' => $query->toSql(),
                'bindingsCount' => count($query->getBindings())
            ]);
        }
        
        // Then, apply changed filters with AND logic (all must match)
        if (!empty($changedFilters)) {
            $query = $this->applyFiltersWithAnd($query, $changedFilters, $userAAge);
            Log::info('After applying AND filters', [
                'sql' => $query->toSql(),
                'bindingsCount' => count($query->getBindings())
            ]);
        }
        
        // Final query logging
        $finalSql = $query->toSql();
        $finalBindings = $query->getBindings();
        Log::info('Final query before execution', [
            'sql' => $finalSql,
            'bindingsCount' => count($finalBindings)
        ]);
        
        return $query;
    }

    /**
     * Detect if a filter value has meaningfully changed
     * Handles arrays, numeric values, empty values, and strings
     * 
     * @param mixed $defaultValue The original/default value
     * @param mixed $overrideValue The new/override value
     * @return bool True if value has changed, false if unchanged
     */
    private function isFilterValueChanged($defaultValue, $overrideValue)
    {
        // Handle empty values
        $defaultEmpty = $this->isEmptyValue($defaultValue);
        $overrideEmpty = $this->isEmptyValue($overrideValue);
        
        // If both are empty, no change
        if ($defaultEmpty && $overrideEmpty) {
            return false;
        }
        
        // If one is empty and other is not, it's a change
        if ($defaultEmpty || $overrideEmpty) {
            return true;
        }
        
        // Handle arrays (for multi-select fields like pays_recherche, villes_recherche, etc.)
        if (is_array($defaultValue) && is_array($overrideValue)) {
            // Normalize arrays: sort and compare
            $defaultSorted = array_values(array_unique($defaultValue));
            $overrideSorted = array_values(array_unique($overrideValue));
            sort($defaultSorted);
            sort($overrideSorted);
            
            // If arrays are identical, no change
            // Otherwise, any difference (including subset) is considered a change
            return json_encode($defaultSorted) !== json_encode($overrideSorted);
        }
        
        // Handle numeric values (age_min, age_max, children_count, etc.)
        if (is_numeric($defaultValue) || is_numeric($overrideValue)) {
            return (float)$defaultValue != (float)$overrideValue;
        }
        
        // Handle strings (religion, niveau_etudes, etc.)
        return trim((string)$defaultValue) !== trim((string)$overrideValue);
    }

    /**
     * Check if a value is considered empty
     * 
     * @param mixed $value The value to check
     * @return bool True if value is empty/null
     */
    private function isEmptyValue($value)
    {
        if ($value === null || $value === '') {
            return true;
        }
        
        if (is_array($value)) {
            return empty($value);
        }
        
        return false;
    }

    /**
     * Apply filters to query
     * 
     * @param bool $useAndLogic If true, uses AND logic (all filters must match). If false, uses OR logic (at least one must match)
     */
    private function applyFilters($query, $filters, $userAAge, $profileA = null, $useAndLogic = false)
    {
        if ($useAndLogic) {
            // AND logic: all filters must match - apply each filter directly to the query
            return $this->applyFiltersWithAnd($query, $filters, $userAAge);
        } else {
            // OR logic: at least one filter must match - wrap all filters in OR conditions
            return $this->applyFiltersWithOr($query, $filters, $userAAge, $profileA);
        }
    }

    /**
     * Apply filters with AND logic (all filters must match)
     */
    private function applyFiltersWithAnd($query, $filters, $userAAge)
    {
        // Age range match
        if (isset($filters['age_min']) || isset($filters['age_max'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                if (isset($filters['age_min'])) {
                    $minDate = Carbon::today()->subYears($filters['age_min'] + 1)->addDay();
                    $q->where('date_naissance', '<=', $minDate);
                }
                if (isset($filters['age_max'])) {
                    $maxDate = Carbon::today()->subYears($filters['age_max']);
                    $q->where('date_naissance', '>=', $maxDate);
                }
            });
        }

        // Country match
        if (isset($filters['pays_recherche']) && !empty($filters['pays_recherche'])) {
            $countries = is_array($filters['pays_recherche']) 
                ? $filters['pays_recherche'] 
                : [$filters['pays_recherche']];
            $query->whereHas('profile', function($q) use ($countries) {
                $q->where(function($subQ) use ($countries) {
                    $subQ->whereIn('pays_residence', $countries)
                         ->orWhereIn('pays_origine', $countries);
                });
            });
        }

        // Cities match
        if (isset($filters['villes_recherche']) && !empty($filters['villes_recherche'])) {
            $cities = is_array($filters['villes_recherche']) 
                ? $filters['villes_recherche'] 
                : [$filters['villes_recherche']];
            $query->whereHas('profile', function($q) use ($cities) {
                $q->where(function($subQ) use ($cities) {
                    $subQ->whereIn('ville_residence', $cities)
                         ->orWhereIn('ville_origine', $cities);
                });
            });
        }

        // Religion match
        if (isset($filters['religion']) && !empty($filters['religion'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('religion', $filters['religion']);
            });
        }

        // Minimum income match
        if (isset($filters['revenu_minimum']) && !empty($filters['revenu_minimum'])) {
            $minIncomeFilter = $filters['revenu_minimum'];
            $incomeHierarchy = [
                '0-2500' => 1,
                '2500-5000' => 2,
                '5000-10000' => 3,
                '10000-20000' => 4,
                '20000-50000' => 5,
                '50000+' => 6,
            ];
            $minLevel = $incomeHierarchy[$minIncomeFilter] ?? 0;
            
            $query->whereHas('profile', function($q) use ($minLevel, $incomeHierarchy) {
                $q->where('revenu', '!=', 'peu-importe')
                  ->where(function($subQ) use ($minLevel, $incomeHierarchy) {
                      foreach ($incomeHierarchy as $range => $level) {
                          if ($level >= $minLevel) {
                              $subQ->orWhere('revenu', $range);
                          }
                      }
                  });
            });
        }

        // Education level match
        if (isset($filters['niveau_etudes']) && !empty($filters['niveau_etudes'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('niveau_etudes', $filters['niveau_etudes']);
            });
        }

        // Employment status match
        if (isset($filters['situation_professionnelle']) && !empty($filters['situation_professionnelle'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('situation_professionnelle', $filters['situation_professionnelle']);
            });
        }

        // Marital status match
        if (isset($filters['etat_matrimonial']) && !empty($filters['etat_matrimonial'])) {
            $maritalStatuses = is_array($filters['etat_matrimonial'])
                ? $filters['etat_matrimonial']
                : [$filters['etat_matrimonial']];
            $query->whereHas('profile', function($q) use ($maritalStatuses) {
                $q->whereIn('etat_matrimonial', $maritalStatuses);
            });
        }

        // Health status match
        if (isset($filters['etat_sante']) && !empty($filters['etat_sante'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('etat_sante', $filters['etat_sante']);
            });
        }

        // Smoker match
        if (isset($filters['fumeur']) && $filters['fumeur'] !== '') {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('fumeur', $filters['fumeur']);
            });
        }

        // Drinker match
        if (isset($filters['buveur']) && $filters['buveur'] !== '') {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('buveur', $filters['buveur']);
            });
        }

        // Has children match
        if (isset($filters['has_children']) && $filters['has_children'] !== '') {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('has_children', $filters['has_children'] === 'yes' || $filters['has_children'] === true);
            });
        }

        // Origin match
        if (isset($filters['origine']) && !empty($filters['origine'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('origine', $filters['origine']);
            });
        }

        // Housing match
        if (isset($filters['logement']) && !empty($filters['logement'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('logement', $filters['logement']);
            });
        }

        // Height range match
        if (isset($filters['taille_min']) || isset($filters['taille_max'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                if (isset($filters['taille_min'])) {
                    $q->where('taille', '>=', $filters['taille_min']);
                }
                if (isset($filters['taille_max'])) {
                    $q->where('taille', '<=', $filters['taille_max']);
                }
            });
        }

        // Weight range match
        if (isset($filters['poids_min']) || isset($filters['poids_max'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                if (isset($filters['poids_min'])) {
                    $q->where('poids', '>=', $filters['poids_min']);
                }
                if (isset($filters['poids_max'])) {
                    $q->where('poids', '<=', $filters['poids_max']);
                }
            });
        }

        // Country of residence match
        if (isset($filters['pays_residence']) && !empty($filters['pays_residence'])) {
            $countries = is_array($filters['pays_residence']) 
                ? $filters['pays_residence'] 
                : [$filters['pays_residence']];
            $query->whereHas('profile', function($q) use ($countries) {
                $q->whereIn('pays_residence', $countries);
            });
        }

        // Country of origin match
        if (isset($filters['pays_origine']) && !empty($filters['pays_origine'])) {
            $countries = is_array($filters['pays_origine']) 
                ? $filters['pays_origine'] 
                : [$filters['pays_origine']];
            $query->whereHas('profile', function($q) use ($countries) {
                $q->whereIn('pays_origine', $countries);
            });
        }

        // City of residence match
        if (isset($filters['ville_residence']) && !empty($filters['ville_residence'])) {
            $cities = is_array($filters['ville_residence']) 
                ? $filters['ville_residence'] 
                : [$filters['ville_residence']];
            $query->whereHas('profile', function($q) use ($cities) {
                $q->whereIn('ville_residence', $cities);
            });
        }

        // City of origin match
        if (isset($filters['ville_origine']) && !empty($filters['ville_origine'])) {
            $cities = is_array($filters['ville_origine']) 
                ? $filters['ville_origine'] 
                : [$filters['ville_origine']];
            $query->whereHas('profile', function($q) use ($cities) {
                $q->whereIn('ville_origine', $cities);
            });
        }

        // Health situation match (situation_sante is an array)
        if (isset($filters['situation_sante']) && !empty($filters['situation_sante'])) {
            $healthSituations = is_array($filters['situation_sante']) 
                ? $filters['situation_sante'] 
                : [$filters['situation_sante']];
            $query->whereHas('profile', function($q) use ($healthSituations) {
                $q->where(function($subQ) use ($healthSituations) {
                    foreach ($healthSituations as $situation) {
                        $subQ->orWhereJsonContains('situation_sante', $situation);
                    }
                });
            });
        }

        // Motorized match
        if (isset($filters['motorise']) && $filters['motorise'] !== '') {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('motorise', $filters['motorise']);
            });
        }

        // Number of children match
        if (isset($filters['children_count']) && $filters['children_count'] !== '') {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('children_count', $filters['children_count']);
            });
        }

        // Hijab choice match (for women)
        if (isset($filters['hijab_choice']) && !empty($filters['hijab_choice'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('hijab_choice', $filters['hijab_choice']);
            });
        }

        // Veil match (for women)
        if (isset($filters['veil']) && !empty($filters['veil'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('veil', $filters['veil']);
            });
        }

        // Niqab acceptance match (for women)
        if (isset($filters['niqab_acceptance']) && !empty($filters['niqab_acceptance'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('niqab_acceptance', $filters['niqab_acceptance']);
            });
        }

        // Polygamy match (for women)
        if (isset($filters['polygamy']) && !empty($filters['polygamy'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('polygamy', $filters['polygamy']);
            });
        }

        // Foreign marriage match (for women)
        if (isset($filters['foreign_marriage']) && !empty($filters['foreign_marriage'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('foreign_marriage', $filters['foreign_marriage']);
            });
        }

        // Work after marriage match (for women)
        if (isset($filters['work_after_marriage']) && !empty($filters['work_after_marriage'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('work_after_marriage', $filters['work_after_marriage']);
            });
        }

        // Sport match
        if (isset($filters['sport']) && !empty($filters['sport'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('sport', $filters['sport']);
            });
        }

        // Sector match
        if (isset($filters['secteur']) && !empty($filters['secteur'])) {
            $query->whereHas('profile', function($q) use ($filters) {
                $q->where('secteur', $filters['secteur']);
            });
        }

        return $query;
    }

    /**
     * Apply filters with OR logic (at least one filter must match)
     */
    private function applyFiltersWithOr($query, $filters, $userAAge, $profileA = null)
    {
        // Collect all preference matches - use OR logic
        $hasAnyFilters = false;
        
        // Only apply OR where clause if we have filters
        // If no filters, show all profiles (don't add any constraint)
        $query->where(function($mainQuery) use ($filters, $userAAge, $profileA, &$hasAnyFilters) {
            // Age range match
            if (isset($filters['age_min']) || isset($filters['age_max'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    if (isset($filters['age_min'])) {
                        $minDate = Carbon::today()->subYears($filters['age_min'] + 1)->addDay();
                        $q->where('date_naissance', '<=', $minDate);
                    }
                    if (isset($filters['age_max'])) {
                        $maxDate = Carbon::today()->subYears($filters['age_max']);
                        $q->where('date_naissance', '>=', $maxDate);
                    }
                });
            }

            // Country match
            if (isset($filters['pays_recherche']) && !empty($filters['pays_recherche'])) {
                $hasAnyFilters = true;
                $countries = is_array($filters['pays_recherche']) 
                    ? $filters['pays_recherche'] 
                    : [$filters['pays_recherche']];
                $mainQuery->orWhereHas('profile', function($q) use ($countries) {
                    $q->whereIn('pays_residence', $countries)
                      ->orWhereIn('pays_origine', $countries);
                });
            }

            // Cities match
            if (isset($filters['villes_recherche']) && !empty($filters['villes_recherche'])) {
                $hasAnyFilters = true;
                $cities = is_array($filters['villes_recherche']) 
                    ? $filters['villes_recherche'] 
                    : [$filters['villes_recherche']];
                $mainQuery->orWhereHas('profile', function($q) use ($cities) {
                    $q->whereIn('ville_residence', $cities)
                      ->orWhereIn('ville_origine', $cities);
                });
            }

            // Religion match
            if (isset($filters['religion']) && !empty($filters['religion'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('religion', $filters['religion']);
                });
            }

            // Minimum income match
            if (isset($filters['revenu_minimum']) && !empty($filters['revenu_minimum'])) {
                $hasAnyFilters = true;
                $minIncomeFilter = $filters['revenu_minimum'];
                $incomeHierarchy = [
                    '0-2500' => 1,
                    '2500-5000' => 2,
                    '5000-10000' => 3,
                    '10000-20000' => 4,
                    '20000-50000' => 5,
                    '50000+' => 6,
                ];
                $minLevel = $incomeHierarchy[$minIncomeFilter] ?? 0;
                
                $mainQuery->orWhereHas('profile', function($q) use ($minIncomeFilter, $minLevel, $incomeHierarchy) {
                    $q->where('revenu', '!=', 'peu-importe')
                      ->where(function($subQ) use ($minIncomeFilter, $minLevel, $incomeHierarchy) {
                          foreach ($incomeHierarchy as $range => $level) {
                              if ($level >= $minLevel) {
                                  $subQ->orWhere('revenu', $range);
                              }
                          }
                      });
                });
            }

            // Education level match
            if (isset($filters['niveau_etudes']) && !empty($filters['niveau_etudes'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('niveau_etudes', $filters['niveau_etudes']);
                });
            }

            // Employment status match
            if (isset($filters['situation_professionnelle']) && !empty($filters['situation_professionnelle'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('situation_professionnelle', $filters['situation_professionnelle']);
                });
            }

            // Marital status match
            if (isset($filters['etat_matrimonial']) && !empty($filters['etat_matrimonial'])) {
                $hasAnyFilters = true;
                $maritalStatuses = is_array($filters['etat_matrimonial'])
                    ? $filters['etat_matrimonial']
                    : [$filters['etat_matrimonial']];
                $mainQuery->orWhereHas('profile', function($q) use ($maritalStatuses) {
                    $q->whereIn('etat_matrimonial', $maritalStatuses);
                });
            }

            // Health status match
            if (isset($filters['etat_sante']) && !empty($filters['etat_sante'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('etat_sante', $filters['etat_sante']);
                });
            }

            // Smoker match
            if (isset($filters['fumeur']) && $filters['fumeur'] !== '') {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('fumeur', $filters['fumeur']);
                });
            }

            // Drinker match
            if (isset($filters['buveur']) && $filters['buveur'] !== '') {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('buveur', $filters['buveur']);
                });
            }

            // Has children match
            if (isset($filters['has_children']) && $filters['has_children'] !== '') {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('has_children', $filters['has_children'] === 'yes' || $filters['has_children'] === true);
                });
            }

            // Origin match
            if (isset($filters['origine']) && !empty($filters['origine'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('origine', $filters['origine']);
                });
            }

            // Housing match
            if (isset($filters['logement']) && !empty($filters['logement'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('logement', $filters['logement']);
                });
            }

            // Height range match
            if (isset($filters['taille_min']) || isset($filters['taille_max'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    if (isset($filters['taille_min'])) {
                        $q->where('taille', '>=', $filters['taille_min']);
                    }
                    if (isset($filters['taille_max'])) {
                        $q->where('taille', '<=', $filters['taille_max']);
                    }
                });
            }

            // Weight range match
            if (isset($filters['poids_min']) || isset($filters['poids_max'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    if (isset($filters['poids_min'])) {
                        $q->where('poids', '>=', $filters['poids_min']);
                    }
                    if (isset($filters['poids_max'])) {
                        $q->where('poids', '<=', $filters['poids_max']);
                    }
                });
            }

            // Country of residence match
            if (isset($filters['pays_residence']) && !empty($filters['pays_residence'])) {
                $hasAnyFilters = true;
                $countries = is_array($filters['pays_residence']) 
                    ? $filters['pays_residence'] 
                    : [$filters['pays_residence']];
                $mainQuery->orWhereHas('profile', function($q) use ($countries) {
                    $q->whereIn('pays_residence', $countries);
                });
            }

            // Country of origin match
            if (isset($filters['pays_origine']) && !empty($filters['pays_origine'])) {
                $hasAnyFilters = true;
                $countries = is_array($filters['pays_origine']) 
                    ? $filters['pays_origine'] 
                    : [$filters['pays_origine']];
                $mainQuery->orWhereHas('profile', function($q) use ($countries) {
                    $q->whereIn('pays_origine', $countries);
                });
            }

            // City of residence match
            if (isset($filters['ville_residence']) && !empty($filters['ville_residence'])) {
                $hasAnyFilters = true;
                $cities = is_array($filters['ville_residence']) 
                    ? $filters['ville_residence'] 
                    : [$filters['ville_residence']];
                $mainQuery->orWhereHas('profile', function($q) use ($cities) {
                    $q->whereIn('ville_residence', $cities);
                });
            }

            // City of origin match
            if (isset($filters['ville_origine']) && !empty($filters['ville_origine'])) {
                $hasAnyFilters = true;
                $cities = is_array($filters['ville_origine']) 
                    ? $filters['ville_origine'] 
                    : [$filters['ville_origine']];
                $mainQuery->orWhereHas('profile', function($q) use ($cities) {
                    $q->whereIn('ville_origine', $cities);
                });
            }

            // Health situation match (situation_sante is an array)
            if (isset($filters['situation_sante']) && !empty($filters['situation_sante'])) {
                $hasAnyFilters = true;
                $healthSituations = is_array($filters['situation_sante']) 
                    ? $filters['situation_sante'] 
                    : [$filters['situation_sante']];
                $mainQuery->orWhereHas('profile', function($q) use ($healthSituations) {
                    $q->where(function($subQ) use ($healthSituations) {
                        foreach ($healthSituations as $situation) {
                            $subQ->orWhereJsonContains('situation_sante', $situation);
                        }
                    });
                });
            }

            // Motorized match
            if (isset($filters['motorise']) && $filters['motorise'] !== '') {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('motorise', $filters['motorise']);
                });
            }

            // Number of children match
            if (isset($filters['children_count']) && $filters['children_count'] !== '') {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('children_count', $filters['children_count']);
                });
            }

            // Hijab choice match (for women)
            if (isset($filters['hijab_choice']) && !empty($filters['hijab_choice'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('hijab_choice', $filters['hijab_choice']);
                });
            }

            // Veil match (for women)
            if (isset($filters['veil']) && !empty($filters['veil'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('veil', $filters['veil']);
                });
            }

            // Niqab acceptance match (for women)
            if (isset($filters['niqab_acceptance']) && !empty($filters['niqab_acceptance'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('niqab_acceptance', $filters['niqab_acceptance']);
                });
            }

            // Polygamy match (for women)
            if (isset($filters['polygamy']) && !empty($filters['polygamy'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('polygamy', $filters['polygamy']);
                });
            }

            // Foreign marriage match (for women)
            if (isset($filters['foreign_marriage']) && !empty($filters['foreign_marriage'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('foreign_marriage', $filters['foreign_marriage']);
                });
            }

            // Work after marriage match (for women)
            if (isset($filters['work_after_marriage']) && !empty($filters['work_after_marriage'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('work_after_marriage', $filters['work_after_marriage']);
                });
            }

            // Sport match
            if (isset($filters['sport']) && !empty($filters['sport'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('sport', $filters['sport']);
                });
            }

            // Sector match
            if (isset($filters['secteur']) && !empty($filters['secteur'])) {
                $hasAnyFilters = true;
                $mainQuery->orWhereHas('profile', function($q) use ($filters) {
                    $q->where('secteur', $filters['secteur']);
                });
            }

            // If no filters are set, show all profiles (add condition that's always true)
            if (!$hasAnyFilters) {
                $mainQuery->orWhereRaw('1 = 1');
            }
        });

        return $query;
    }

    /**
     * Score and rank matches
     */
    private function scoreAndRankMatches($candidates, $profileA, $userAAge)
    {
        $scoredMatches = [];

        foreach ($candidates as $candidate) {
            $profileB = $candidate->profile;
            if (!$profileB) continue;

            $score = 0;
            $details = [];

            // Age compatibility (+20 points)
            // If User A has age_minimum preference: symmetric range [userAAge - age_minimum, userAAge + age_minimum] (minimum 18)
            // Default: [userAAge - 10, userAAge + 10] if no preference
            if ($profileA->date_naissance && $profileB->date_naissance && $userAAge) {
                $ageB = Carbon::parse($profileB->date_naissance)->age;
                
                if ($profileA->age_minimum) {
                    // Use symmetric range based on age_minimum preference
                    $ageRange = $profileA->age_minimum;
                    $ageMinRange = max(18, $userAAge - $ageRange);
                    $ageMaxRange = $userAAge + $ageRange;
                } else {
                    // Default: [userAAge - 10, userAAge + 10]
                    $ageMinRange = max(18, $userAAge - 10);
                    $ageMaxRange = $userAAge + 10;
                }
                
                if ($ageB >= $ageMinRange && $ageB <= $ageMaxRange) {
                    $score += 20;
                    $details['age'] = 20;
                } elseif ($ageB >= ($ageMinRange - 5) && $ageB <= ($ageMaxRange + 5)) {
                    $score += 10;
                    $details['age'] = 10;
                }
            }

            // Education compatibility (+15 points)
            if ($profileA->niveau_etudes_recherche && $profileB->niveau_etudes) {
                if ($profileB->niveau_etudes === $profileA->niveau_etudes_recherche) {
                    $score += 15;
                    $details['education'] = 15;
                } elseif ($this->isEducationCompatible($profileB->niveau_etudes, $profileA->niveau_etudes_recherche)) {
                    $score += 8;
                    $details['education'] = 8;
                }
            }

            // Country compatibility (+10 points)
            // Matches if candidate's pays_residence or pays_origine is in User A's preferred countries
            if ($profileA->pays_recherche && is_array($profileA->pays_recherche)) {
                if (in_array($profileB->pays_residence, $profileA->pays_recherche) ||
                    in_array($profileB->pays_origine, $profileA->pays_recherche)) {
                    $score += 10;
                    $details['country'] = 10;
                }
            }

            // City compatibility (+10 points)
            // Matches if candidate's ville_residence or ville_origine is in User A's preferred cities
            if ($profileA->villes_recherche && is_array($profileA->villes_recherche)) {
                if (in_array($profileB->ville_residence, $profileA->villes_recherche) ||
                    in_array($profileB->ville_origine, $profileA->villes_recherche)) {
                    $score += 10;
                    $details['city'] = 10;
                }
            }

            // Religion compatibility (+10 points)
            if ($profileA->religion_recherche && $profileB->religion) {
                if ($profileB->religion === $profileA->religion_recherche) {
                    $score += 10;
                    $details['religion'] = 10;
                }
            }

            // Income compatibility (+10 points)
            if ($profileA->revenu_minimum && $profileB->revenu) {
                if ($this->compareIncome($profileB->revenu, $profileA->revenu_minimum)) {
                    $score += 10;
                    $details['income'] = 10;
                }
            }

            // Employment status compatibility (+10 points)
            // Exact match with candidate's situation_professionnelle
            if ($profileA->statut_emploi_recherche && $profileB->situation_professionnelle) {
                if ($profileB->situation_professionnelle === $profileA->statut_emploi_recherche) {
                    $score += 10;
                    $details['employment'] = 10;
                }
            }

            // Marital status compatibility (+10 points)
            // Candidate's etat_matrimonial must be in User A's preferred statuses
            if ($profileA->situation_matrimoniale_recherche && $profileB->etat_matrimonial) {
                $preferredStatuses = is_array($profileA->situation_matrimoniale_recherche) 
                    ? $profileA->situation_matrimoniale_recherche 
                    : [$profileA->situation_matrimoniale_recherche];
                $candidateStatus = is_array($profileB->etat_matrimonial) 
                    ? $profileB->etat_matrimonial 
                    : [$profileB->etat_matrimonial];
                
                if (count(array_intersect($preferredStatuses, $candidateStatus)) > 0) {
                    $score += 10;
                    $details['marital_status'] = 10;
                }
            }

            // Health status compatibility (+10 points)
            // Candidate's situation_sante must be in User A's preferred health statuses
            if ($profileA->situation_sante && $profileB->situation_sante) {
                $preferredHealth = is_array($profileA->situation_sante) 
                    ? $profileA->situation_sante 
                    : [$profileA->situation_sante];
                $candidateHealth = is_array($profileB->situation_sante) 
                    ? $profileB->situation_sante 
                    : [$profileB->situation_sante];
                
                if (count(array_intersect($preferredHealth, $candidateHealth)) > 0) {
                    $score += 10;
                    $details['health'] = 10;
                }
            }

            // Smoking compatibility (+5 points)
            // Exact match with candidate's fumeur
            if ($profileA->fumeur && $profileB->fumeur) {
                if ($profileB->fumeur === $profileA->fumeur) {
                    $score += 5;
                    $details['smoking'] = 5;
                }
            }

            // Drinking compatibility (+5 points)
            // Exact match with candidate's buveur
            if ($profileA->buveur && $profileB->buveur) {
                if ($profileB->buveur === $profileA->buveur) {
                    $score += 5;
                    $details['drinking'] = 5;
                }
            }

            // Has children compatibility (+5 points)
            // Exact match with candidate's has_children
            if ($profileA->has_children !== null && $profileB->has_children !== null) {
                if ($profileB->has_children === $profileA->has_children) {
                    $score += 5;
                    $details['has_children'] = 5;
                }
            }

            // Housing compatibility (+5 points)
            // Exact match with candidate's logement
            if ($profileA->logement && $profileB->logement) {
                if ($profileB->logement === $profileA->logement) {
                    $score += 5;
                    $details['housing'] = 5;
                }
            }

            // Lifestyle compatibility (sport) (+5 points)
            if ($profileB->sport && $profileA->sport) {
                if ($profileB->sport === $profileA->sport) {
                    $score += 5;
                    $details['sport'] = 5;
                }
            }

            // Hobbies compatibility (+5 points)
            if ($profileA->loisirs && $profileB->loisirs) {
                $hobbiesA = is_array($profileA->loisirs) ? $profileA->loisirs : explode(',', $profileA->loisirs);
                $hobbiesB = is_array($profileB->loisirs) ? $profileB->loisirs : explode(',', $profileB->loisirs);
                $commonHobbies = count(array_intersect($hobbiesA, $hobbiesB));
                if ($commonHobbies > 0) {
                    $score += min(5, $commonHobbies);
                    $details['hobbies'] = min(5, $commonHobbies);
                }
            }

            // Origin compatibility (+5 points)
            if ($profileA->origine && $profileB->origine) {
                if ($profileB->origine === $profileA->origine) {
                    $score += 5;
                    $details['origin'] = 5;
                }
            }

            // Calculate profile completeness (for display only, not included in score)
            $completeness = $this->calculateProfileCompleteness($profileB);

            $scoredMatches[] = [
                'user' => $candidate,
                'profile' => $profileB,
                'score' => round($score, 2),
                'scoreDetails' => $details,
                'completeness' => $completeness,
            ];
        }

        // Sort by score (descending), then by completeness, then by updated_at
        usort($scoredMatches, function($a, $b) {
            if ($a['score'] != $b['score']) {
                return $b['score'] <=> $a['score'];
            }
            if ($a['completeness'] != $b['completeness']) {
                return $b['completeness'] <=> $a['completeness'];
            }
            return strtotime($b['user']->updated_at) <=> strtotime($a['user']->updated_at);
        });

        return $scoredMatches;
    }

    /**
     * Check if education levels are compatible
     */
    private function isEducationCompatible($levelB, $preferredLevel)
    {
        // Define education hierarchy
        $hierarchy = [
            'Primaire' => 1,
            'Collège' => 2,
            'Lycée' => 3,
            'Baccalauréat' => 4,
            'Bac+2' => 5,
            'Bac+3' => 6,
            'Bac+4' => 7,
            'Bac+5' => 8,
            'Doctorat' => 9,
        ];

        $levelBValue = $hierarchy[$levelB] ?? 0;
        $preferredValue = $hierarchy[$preferredLevel] ?? 0;

        // Consider compatible if within 1 level
        return abs($levelBValue - $preferredValue) <= 1;
    }

    /**
     * Compare income values
     */
    private function compareIncome($incomeB, $minimumIncome)
    {
        // Extract numeric values from income strings
        $incomeBNum = $this->extractIncomeValue($incomeB);
        $minimumNum = $this->extractIncomeValue($minimumIncome);

        return $incomeBNum >= $minimumNum;
    }

    /**
     * Extract numeric value from income string
     */
    private function extractIncomeValue($income)
    {
        // Remove non-numeric characters except decimal point
        $cleaned = preg_replace('/[^0-9.]/', '', $income);
        return (float) $cleaned;
    }

    /**
     * Calculate profile completeness percentage
     */
    private function calculateProfileCompleteness($profile)
    {
        $fields = [
            'nom', 'prenom', 'date_naissance', 'niveau_etudes', 'situation_professionnelle',
            'secteur', 'revenu', 'religion', 'etat_matrimonial', 'logement', 'taille',
            'poids', 'etat_sante', 'fumeur', 'buveur', 'sport', 'motorise', 'loisirs',
            'origine', 'ville_residence', 'pays_residence', 'ville_origine', 'pays_origine',
            'apropos_description', 'profile_picture_path'
        ];

        $filled = 0;
        foreach ($fields as $field) {
            if (!empty($profile->$field)) {
                $filled++;
            }
        }

        return ($filled / count($fields)) * 100;
    }
}

