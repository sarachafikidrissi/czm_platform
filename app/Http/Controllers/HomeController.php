<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * Display the welcome page.
     */
    public function index(): Response
    {
        return Inertia::render('welcome');
    }
}


