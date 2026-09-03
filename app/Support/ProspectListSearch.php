<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

class ProspectListSearch
{
    private const LIKE_ESCAPE_CHAR = '\\';

    /**
     * Escape SQL LIKE wildcard characters so user input is matched literally.
     */
    private static function escapeLike(string $value): string
    {
        return str_replace(
            ['\\', '%', '_'],
            ['\\\\', '\\%', '\\_'],
            $value
        );
    }

    /**
     * Apply name/email/username/commercial-code search before pagination.
     */
    public static function apply(Builder $query, ?string $search): string
    {
        $trimmed = trim((string) $search);
        if ($trimmed === '') {
            return '';
        }

        $searchLower = mb_strtolower($trimmed);
        $escapedSearch = self::escapeLike($searchLower);
        $pattern = '%'.$escapedSearch.'%';
        $escape = self::LIKE_ESCAPE_CHAR;

        $query->where(function ($q) use ($pattern, $escape) {
            $q->whereRaw('LOWER(users.name) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereRaw('LOWER(users.email) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereRaw('LOWER(users.username) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereHas('profile', function ($pq) use ($pattern, $escape) {
                    $pq->where('heard_about_us', 'commercial_terrain')
                        ->whereRaw('LOWER(heard_about_reference) LIKE ? ESCAPE ?', [$pattern, $escape]);
                });
        });

        return $trimmed;
    }
}
