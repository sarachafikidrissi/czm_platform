<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateUsernames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:generate-usernames';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate usernames for existing users who don\'t have one';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $users = User::whereNull('username')->get();
        
        if ($users->isEmpty()) {
            $this->info('All users already have usernames.');
            return;
        }

        $this->info("Found {$users->count()} users without usernames.");

        foreach ($users as $user) {
            $baseUsername = Str::slug($user->name);
            $username = $baseUsername;
            $counter = 1;

            // Ensure username is unique
            while (User::where('username', $username)->exists()) {
                $username = $baseUsername . $counter;
                $counter++;
            }

            $user->update(['username' => $username]);
            $this->line("Generated username '{$username}' for {$user->name}");
        }

        $this->info('Username generation completed successfully!');
    }
}
