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
     * Apply name, email, username, phone, document-number, and commercial-code search before pagination.
     *
     * Document numbers (CIN, passport, driver's license) are stored as an HMAC, so they match
     * only when the query is the full number.
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
        $phonePatterns = self::phoneDigitPatterns($searchLower);
        $documentHash = self::documentHash($trimmed);

        $query->where(function ($q) use ($pattern, $escape, $phonePatterns, $documentHash) {
            $q->whereRaw('LOWER(users.name) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereRaw('LOWER(users.email) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereRaw('LOWER(users.username) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereRaw('LOWER(users.phone) LIKE ? ESCAPE ?', [$pattern, $escape])
                ->orWhereHas('profile', function ($pq) use ($pattern, $escape) {
                    $pq->where('heard_about_us', 'commercial_terrain')
                        ->whereRaw('LOWER(heard_about_reference) LIKE ? ESCAPE ?', [$pattern, $escape]);
                });

            foreach ($phonePatterns as $phonePattern) {
                $q->orWhereRaw(
                    "LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(users.phone, ''), ' ', ''), '-', ''), '.', ''), '(', ''), ')', ''), '+', '')) LIKE ? ESCAPE ?",
                    [$phonePattern, $escape]
                );
            }

            if ($documentHash !== null) {
                $q->orWhereHas('profile', function ($pq) use ($documentHash) {
                    $pq->where('cin_hash', $documentHash);
                });
            }
        });

        return $trimmed;
    }

    /**
     * Digit-only phone patterns.
     *
     * Separators are ignored. A number longer than 9 digits also matches its last 9 digits,
     * so 0612345678 and +212612345678 find the same person.
     *
     * @return list<string>
     */
    private static function phoneDigitPatterns(string $searchLower): array
    {
        $digits = preg_replace('/[\s.\-()+]/', '', $searchLower) ?? '';
        if ($digits === '' || ! preg_match('/^\d+$/', $digits)) {
            return [];
        }

        $patterns = ['%'.self::escapeLike($digits).'%'];
        if (strlen($digits) > 9) {
            $patterns[] = '%'.self::escapeLike(substr($digits, -9)).'%';
        }

        return array_values(array_unique($patterns));
    }

    /**
     * Hash a CIN, passport, or driver's license the same way it is stored on the profile.
     */
    private static function documentHash(string $search): ?string
    {
        $candidate = strtoupper(preg_replace('/\s+/', '', $search) ?? '');
        if (! preg_match('/^[A-Z0-9-]{5,20}$/', $candidate)) {
            return null;
        }

        $appKey = (string) config('app.key');
        if (str_starts_with($appKey, 'base64:')) {
            $decoded = base64_decode(substr($appKey, 7));
            if ($decoded !== false) {
                $appKey = $decoded;
            }
        }

        return hash_hmac('sha256', $candidate, $appKey);
    }
}
