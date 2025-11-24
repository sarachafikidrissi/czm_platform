<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use App\Models\Secteur;

class LocationController extends Controller
{
    /**
     * Get all countries and cities from local JSON files
     *
     * @return JsonResponse
     */
    public function getLocations(): JsonResponse
    {
        try {
            $countriesPath = resource_path('data/countries.json');

            if (!File::exists($countriesPath)) {
                return response()->json([
                    'error' => 'Location data files not found'
                ], 404);
            }

            // Increase memory limit for large JSON files
            $memoryLimit = ini_get('memory_limit');
            ini_set('memory_limit', '512M');

            $countries = json_decode(File::get($countriesPath), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json([
                    'error' => 'Invalid JSON data in location files'
                ], 500);
            }

            // Restore original memory limit
            ini_set('memory_limit', $memoryLimit);

            // Return only countries (cities are already included in each country's cities array)
            // This matches what the React components expect
            return response()->json([
                'countries' => $countries ?? [],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to load location data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all secteurs d'activité
     *
     * @return JsonResponse
     */
    public function getSecteurs(): JsonResponse
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('secteurs')) {
                return response()->json([
                    'secteurs' => []
                ]);
            }

            $secteurs = Secteur::orderBy('name')->get();
            
            return response()->json([
                'secteurs' => $secteurs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to load secteurs: ' . $e->getMessage()
            ], 500);
        }
    }
}

