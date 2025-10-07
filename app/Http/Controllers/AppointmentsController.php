<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class AppointmentsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('appointments');
    }
}


