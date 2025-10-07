<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class StaticPageController extends Controller
{
    /**
     * Generic page renderer for simple static inertia pages.
     */
    public function show(string $page): Response
    {
        return Inertia::render($page);
    }
}


