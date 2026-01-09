<?php

namespace App\Http\Controllers;

use App\Models\AppointmentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class AppointmentRequestController extends Controller
{
    /**
     * Show the appointment request form page
     */
    public function create()
    {
        return Inertia::render('appointment-request', [
            'status' => session('success'),
        ]);
    }

    /**
     * Store a new appointment request from the form
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'reason' => 'required|string|max:2000',
            'preferred_date' => 'nullable|date',
            'message' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $appointmentRequest = AppointmentRequest::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'city' => $request->city,
            'country' => $request->country,
            'reason' => $request->reason,
            'preferred_date' => $request->preferred_date ? date('Y-m-d H:i:s', strtotime($request->preferred_date)) : null,
            'message' => $request->message,
            'status' => 'pending',
            'treatment_status' => 'pending',
        ]);

        return redirect()->route('appointment-request.create')->with('success', 'Votre demande de rendez-vous a été envoyée avec succès. Nous vous contacterons bientôt.');
    }
}

