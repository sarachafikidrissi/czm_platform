<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\UsernameGenerator;
use Illuminate\Console\Command;

class GenerateUsernames extends Command
{
    protected $signature = 'app:generate-usernames';

    protected $description = 'Generate usernames for existing users who don\'t have one';

    public function handle()
    {
        $users = User::query()
            ->where(function ($query) {
                $query->whereNull('username')->orWhere('username', '');
            })
            ->get();

        if ($users->isEmpty()) {
            $this->info('All users already have usernames.');

            return self::SUCCESS;
        }

        $this->info("Found {$users->count()} users without usernames.");

        foreach ($users as $user) {
            $username = UsernameGenerator::fromName($user->name, $user->email, $user->id);
            $user->update(['username' => $username]);
        }

        $this->info('Username generation completed successfully!');

        return self::SUCCESS;
    }
}
