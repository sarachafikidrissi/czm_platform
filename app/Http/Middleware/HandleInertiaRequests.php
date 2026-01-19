<?php

namespace App\Http\Middleware;

use App\Models\PropositionRequest;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => function () use ($request) {
                    $user = $request->user();
                    return $user ? $user->loadMissing('assignedMatchmaker') : null;
                },
            ],
            // Expose the first role name globally for frontend role-based UI
            'role' => function () use ($request) {
                $user = $request->user();
                if (! $user) {
                    return null;
                }
                // If spatie/laravel-permission is installed, get the first role name
                if (method_exists($user, 'getRoleNames')) {
                    return $user->getRoleNames()->first();
                }
                return null;
            },
            'notifications' => function () use ($request) {
                $user = $request->user();
                if (! $user || !method_exists($user, 'getRoleNames')) {
                    return null;
                }
                if ($user->getRoleNames()->first() !== 'matchmaker') {
                    return null;
                }

                $receivedPending = PropositionRequest::where('to_matchmaker_id', $user->id)
                    ->where('status', 'pending')
                    ->count();
                $sentResponded = PropositionRequest::where('from_matchmaker_id', $user->id)
                    ->whereIn('status', ['accepted', 'rejected'])
                    ->count();
                $recentRequests = PropositionRequest::query()
                    ->where(function ($query) use ($user) {
                        $query->where('to_matchmaker_id', $user->id)
                            ->orWhere('from_matchmaker_id', $user->id);
                    })
                    ->with(['referenceUser.profile', 'compatibleUser.profile', 'fromMatchmaker', 'toMatchmaker'])
                    ->orderByDesc('created_at')
                    ->limit(5)
                    ->get()
                    ->map(function (PropositionRequest $request) use ($user) {
                        $isReceived = (int) $request->to_matchmaker_id === (int) $user->id;

                        return [
                            'id' => $request->id,
                            'type' => $isReceived ? 'received' : 'sent',
                            'status' => $request->status,
                            'message' => $request->message,
                            'created_at' => $request->created_at?->toIso8601String(),
                            'reference_user' => $request->referenceUser ? [
                                'id' => $request->referenceUser->id,
                                'name' => $request->referenceUser->name,
                                'profile_picture_path' => $request->referenceUser->profile->profile_picture_path ?? null,
                            ] : null,
                            'compatible_user' => $request->compatibleUser ? [
                                'id' => $request->compatibleUser->id,
                                'name' => $request->compatibleUser->name,
                                'profile_picture_path' => $request->compatibleUser->profile->profile_picture_path ?? null,
                            ] : null,
                            'from_matchmaker' => $request->fromMatchmaker ? [
                                'id' => $request->fromMatchmaker->id,
                                'name' => $request->fromMatchmaker->name,
                            ] : null,
                            'to_matchmaker' => $request->toMatchmaker ? [
                                'id' => $request->toMatchmaker->id,
                                'name' => $request->toMatchmaker->name,
                            ] : null,
                        ];
                    });

                return [
                    'propositionRequests' => [
                        'receivedPending' => $receivedPending,
                        'sentResponded' => $sentResponded,
                        'total' => $receivedPending + $sentResponded,
                        'items' => $recentRequests,
                    ],
                ];
            },
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ]
        ];
    }
}
