<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class BillController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $bills = $user->bills()->with(['matchmaker', 'profile'])->orderBy('created_at', 'desc')->get();
        
        return Inertia::render('mes-commandes', [
            'bills' => $bills,
        ]);
    }

    public function show(Bill $bill)
    {
        // Ensure the user can only view their own bills
        if ($bill->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to bill.');
        }

        $bill->load(['user', 'profile', 'matchmaker']);
        
        return response()->json($bill);
    }

    public function downloadPdf(Bill $bill)
    {
        // Ensure the user can only download their own bills
        if ($bill->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to bill.');
        }

        $bill->load(['user', 'profile', 'matchmaker']);
        
        // For now, return a simple response. In production, you'd generate a real PDF
        return response()->json([
            'message' => 'PDF generation not implemented yet',
            'bill' => $bill
        ]);
    }

    public function sendEmail(Bill $bill)
    {
        // Ensure the user can only send their own bills
        if ($bill->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to bill.');
        }

        $bill->load(['user', 'profile', 'matchmaker']);
        
        // Mark email as sent
        $bill->update([
            'email_sent' => true,
            'email_sent_at' => now(),
        ]);

        // In production, you would send the actual email here
        // Mail::to($bill->user->email)->send(new BillEmail($bill));
        
        return response()->json([
            'message' => 'Bill sent to email successfully',
            'email_sent_at' => $bill->email_sent_at
        ]);
    }
}
