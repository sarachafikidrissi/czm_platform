<?php

namespace App\Http\Controllers;

use App\Models\UserPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PhotoController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        
        // Only allow users with 'user' role
        if (!$user || !$user->hasRole('user')) {
            abort(403, 'Unauthorized');
        }

        $query = $user->photos()->orderBy('created_at', 'desc');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $query->where('file_name', 'like', '%' . $request->search . '%');
        }

        // Paginate with 8 items per page
        $photos = $query->paginate(8)->withQueryString();
        
        // Transform the data
        $photos->getCollection()->transform(function ($photo) {
            return [
                'id' => $photo->id,
                'file_name' => $photo->file_name,
                'url' => $photo->file_path,
                'created_at' => $photo->created_at->format('D, M d, Y'),
                'created_at_raw' => $photo->created_at->toIso8601String(),
            ];
        });

        return Inertia::render('photos', [
            'photos' => $photos,
            'search' => $request->search ?? '',
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        
        // Only allow users with 'user' role
        if (!$user || !$user->hasRole('user')) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'photos' => 'required|array|min:1|max:10',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10MB max per image
        ]);

        $uploadedPhotos = [];

        foreach ($request->file('photos') as $file) {
            $path = $file->store('user-photos', 'public');
            
            $photo = UserPhoto::create([
                'user_id' => $user->id,
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'file_disk' => 'public',
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);

            $uploadedPhotos[] = $photo;
        }

        return redirect()->route('photos')->with('success', count($uploadedPhotos) . ' photo(s) uploaded successfully.');
    }

    public function destroy(UserPhoto $photo)
    {
        $user = Auth::user();
        
        // Only allow users with 'user' role
        if (!$user || !$user->hasRole('user')) {
            abort(403, 'Unauthorized');
        }

        // Ensure the photo belongs to the authenticated user
        if ($photo->user_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Delete the file from storage
        Storage::disk($photo->file_disk)->delete($photo->file_path);

        // Delete the database record
        $photo->delete();

        return redirect()->route('photos')->with('success', 'Photo deleted successfully.');
    }
}
