<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PropositionsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('propositions');
    }
}


