<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PhotosController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('photos');
    }
}


