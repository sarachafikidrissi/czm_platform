<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class ClearStorageCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    // protected $signature = 'app:clear-storage-command';
    protected $signature = 'storage:clear';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clears specific directories in the storage folder.';
    // protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Storage::disk('public')->deleteDirectory('agencies');
        Storage::disk('public')->deleteDirectory('identity-cards');
        Storage::disk('public')->deleteDirectory('profile-pictures');
        $this->info('Storage directory "uploads" cleared successfully.');
    }
}
