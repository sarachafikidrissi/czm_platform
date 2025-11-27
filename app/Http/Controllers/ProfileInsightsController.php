<?php

namespace App\Http\Controllers;

use App\Models\MatchmakerEvaluation;
use App\Models\MatchmakerNote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProfileInsightsController extends Controller
{
    private function canView(User $target): bool
    {
        /** @var User|null $me */
        $me = Auth::user();
        if (!$me) {
            return false;
        }

        // Admin can always view
        if ($me->hasRole('admin')) {
            return true;
        }

        // Matchmaker can view if assigned
        if ($me->hasRole('matchmaker') && $target->assigned_matchmaker_id === $me->id) {
            return true;
        }

        // Manager can view if they validated OR if prospect was validated by a matchmaker from their agency
        if ($me->hasRole('manager')) {
            // Manager can view if they validated the prospect
            if ($target->validated_by_manager_id === $me->id) {
                return true;
            }
            
            // Manager can view if prospect was validated by a matchmaker from their agency
            if ($target->assigned_matchmaker_id) {
                $assignedMatchmaker = User::find($target->assigned_matchmaker_id);
                if ($assignedMatchmaker && $assignedMatchmaker->agency_id === $me->agency_id) {
                    return true;
                }
            }
        }

        return false;
    }

    private function canWrite(User $target): bool
    {
        /** @var User|null $me */
        $me = Auth::user();
        if (!$me) {
            return false;
        }

        // Admin cannot write (view only)
        if ($me->hasRole('admin')) {
            return false;
        }

        // Matchmaker can write if assigned
        if ($me->hasRole('matchmaker') && $target->assigned_matchmaker_id === $me->id) {
            return true;
        }

        // Manager can write only if they validated the prospect
        if ($me->hasRole('manager') && $target->validated_by_manager_id === $me->id) {
            return true;
        }

        return false;
    }

    public function addNote(Request $request, int $userId)
    {
        $request->validate([
            'content' => 'required|string|max:5000',
            'contact_type' => 'nullable|in:distance,presentiel',
        ]);

        $target = User::findOrFail($userId);

        if (!$this->canWrite($target)) {
            abort(403);
        }

        MatchmakerNote::create([
            'user_id' => $target->id,
            'author_id' => Auth::id(),
            'content' => $request->string('content')->toString(),
            'contact_type' => $request->input('contact_type'),
        ]);

        return redirect()->back()->with('success', 'Note added successfully.');
    }

    public function saveEvaluation(Request $request, int $userId)
    {
        $target = User::findOrFail($userId);

        if (!$this->canWrite($target)) {
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

    public function deleteNote(Request $request, int $userId, int $noteId)
    {
        $target = User::findOrFail($userId);
        $note = MatchmakerNote::findOrFail($noteId);

        // Verify the note belongs to the target user
        if ($note->user_id !== $target->id) {
            abort(404);
        }

        /** @var User|null $me */
        $me = Auth::user();
        if (!$me) {
            abort(403);
        }

        // Allow deletion if:
        // 1. User is admin
        // 2. User is the author of the note (matchmaker/admin/manager)
        if ($me->hasRole('admin') || $note->author_id === $me->id) {
            $note->delete();
            return redirect()->back()->with('success', 'Note deleted successfully.');
        }

        abort(403);
    }
}


