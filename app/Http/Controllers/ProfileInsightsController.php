<?php

namespace App\Http\Controllers;

use App\Models\MatchmakerEvaluation;
use App\Models\MatchmakerNote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProfileInsightsController extends Controller
{
    private function canManage(User $target): bool
    {
        /** @var User|null $me */
        $me = Auth::user();
        if (!$me) {
            return false;
        }

        if ($me->hasRole('admin')) {
            return true;
        }

        if ($me->hasRole('matchmaker') && $target->assigned_matchmaker_id === $me->id) {
            return true;
        }

        if ($me->hasRole('manager') && $target->validated_by_manager_id === $me->id) {
            return true;
        }

        return false;
    }

    public function addNote(Request $request, int $userId)
    {
        $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $target = User::findOrFail($userId);

        if (!$this->canManage($target)) {
            abort(403);
        }

        MatchmakerNote::create([
            'user_id' => $target->id,
            'author_id' => Auth::id(),
            'content' => $request->string('content')->toString(),
        ]);

        return redirect()->back()->with('success', 'Note added successfully.');
    }

    public function saveEvaluation(Request $request, int $userId)
    {
        $target = User::findOrFail($userId);

        if (!$this->canManage($target)) {
            abort(403);
        }

        $validated = $request->validate([
            'status' => 'nullable|in:prospect,member,client',
            'appearance' => 'nullable|string',
            'communication' => 'nullable|string',
            'seriousness' => 'nullable|string',
            'emotional_psychological' => 'nullable|string',
            'values_principles' => 'nullable|string',
            'social_compatibility' => 'nullable|string',
            'qualities' => 'nullable|string',
            'defects' => 'nullable|string',
            'recommendation' => 'nullable|in:ready,accompany,not_ready',
            'remarks' => 'nullable|string',
            'feedback_behavior' => 'nullable|string',
            'feedback_partner_impression' => 'nullable|string',
            'feedback_pos_neg' => 'nullable|string',
        ]);

        $evaluation = MatchmakerEvaluation::firstOrNew([
            'user_id' => $target->id,
        ]);

        $evaluation->fill($validated);
        $evaluation->author_id = Auth::id();
        $evaluation->save();

        return redirect()->back()->with('success', 'Evaluation saved.');
    }
}


