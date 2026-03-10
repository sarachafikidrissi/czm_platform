<?php

namespace App\Services;

use App\Models\UserActivity;

class UserActivityService
{
    /**
     * Log a user activity. Types: proposition, rdv, subscription, status_change, note, matchmaker_assigned.
     */
    public static function log(
        int $userId,
        ?int $performedBy,
        string $type,
        string $description,
        array $metadata = []
    ): ?UserActivity {
        if (! in_array($type, UserActivity::types(), true)) {
            return null;
        }

        return UserActivity::create([
            'user_id' => $userId,
            'performed_by' => $performedBy,
            'type' => $type,
            'description' => $description,
            'metadata' => $metadata,
            'created_at' => now(),
        ]);
    }
}
