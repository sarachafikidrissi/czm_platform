<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

class UsernameGenerator
{
    /**
     * Build a unique username from a person's name.
     * Non-latin names that do not produce a slug fall back to the email, then "user".
     */
    public static function fromName(?string $name, ?string $email = null, ?int $ignoreUserId = null): string
    {
        $base = Str::slug((string) $name);
        if ($base === '' && filled($email)) {
            $base = Str::slug(Str::before((string) $email, '@'));
        }
        if ($base === '') {
            $base = 'user';
        }

        $base = Str::limit($base, 40, '');
        $username = $base;
        $counter = 1;

        while (self::taken($username, $ignoreUserId)) {
            $username = $base.$counter;
            $counter++;
        }

        return $username;
    }

    private static function taken(string $username, ?int $ignoreUserId): bool
    {
        return User::query()
            ->where('username', $username)
            ->when($ignoreUserId, fn ($query) => $query->where('id', '!=', $ignoreUserId))
            ->exists();
    }
}
