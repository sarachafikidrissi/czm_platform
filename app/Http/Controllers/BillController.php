<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\User;
use App\Mail\BillEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

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
        
        $pdf = Pdf::loadView('pdf.invoice', ['bill' => $bill]);
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOption('enable-smart-shrinking', true);
        $pdf->setOption('page-break-inside', 'avoid');
        
        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $bill->bill_number . '.pdf"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }

    public function sendEmail(Bill $bill)
    {
        // Ensure the user can only send their own bills
        if ($bill->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to bill.');
        }

        $bill->load(['user', 'profile', 'matchmaker']);
        
        try {
            // Send the email with PDF attachment
            Mail::to($bill->user->email)->send(new BillEmail($bill));
            
            // Mark email as sent
            $bill->update([
                'email_sent' => true,
                'email_sent_at' => now(),
            ]);
            
            return response()->json([
                'message' => 'Facture envoyée par email avec succès',
                'email_sent_at' => $bill->email_sent_at
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de l\'envoi de l\'email: ' . $e->getMessage()
            ], 500);
        }
    }
}
