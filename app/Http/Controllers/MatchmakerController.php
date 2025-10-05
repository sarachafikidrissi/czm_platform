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
            'cin' => ['required','string','max:20','regex:/^[A-Za-z]{1,2}\d{4,6}$/','unique:profiles,cin'],
            'identity_card_front' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
            'identity_card_back' => 'required|image|mimes:jpeg,png,jpg,gif|max:4096',
        ]);

        $prospect = User::findOrFail($id);
        
        // Store ID card images in profile
        $frontPath = $request->file('identity_card_front')->store('identity-cards', 'public');
        $backPath = $request->file('identity_card_back')->store('identity-cards', 'public');

        $prospect->profile()->updateOrCreate(
            ['user_id' => $prospect->id],
            [
                'cin' => strtoupper($request->cin),
                'identity_card_front_path' => $frontPath,
                'identity_card_back_path' => $backPath,
                'notes' => $request->notes,
                'recommendations' => $request->recommendations,
            ]
        );

        // Assign the prospect to the current matchmaker and set status to member
        $prospect->update([
            'assigned_matchmaker_id' => Auth::id(),
            'status' => 'member', // Change status from prospect to member
        ]);

        return redirect()->back()->with('success', 'Prospect validated and assigned successfully.');
    }
}