<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MatchmakerController extends Controller
{
    public function prospects()
    {
        $prospects = User::role('user')
            ->where('status', 'prospect')
            ->whereNull('assigned_matchmaker_id')
            ->with('profile')
            ->get();
        
        return Inertia::render('matchmaker/prospects', [
            'prospects' => $prospects,
        ]);
    }

    public function validateProspect(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:1000',
            'recommendations' => 'nullable|string|max:1000',
        ]);

        $prospect = User::findOrFail($id);
        
        // Assign the prospect to the current matchmaker
        $prospect->update([
            'assigned_matchmaker_id' => Auth::id(),
            'status' => 'member', // Change status from prospect to member
        ]);

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully.');
    }
}