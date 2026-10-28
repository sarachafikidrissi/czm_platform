<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Bill;
use App\Models\Profile;
use App\Models\Proposition;
use App\Models\Rdv;
use App\Models\User;
use App\Services\StatsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Dashboard KPI and news feed counters reflect real data (and match the lists they open),
 * and a prospect can only be validated once their profile is complete.
 */
class DashboardCountersAndValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $mm;

    private User $other;

    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite' || config("database.connections.{$connection}.database") !== ':memory:') {
            throw new RuntimeException('DashboardCountersAndValidationTest only runs on the in-memory SQLite database.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $this->mm = $this->staff();
        $this->other = $this->staff();
    }

    private function staff(): User
    {
        // Prospect lists require staff linked to an agency.
        $agency = Agency::firstOrCreate(['name' => 'Agence Test'], ['country' => 'MA', 'city' => 'Casablanca', 'address' => '1 Rue Test']);
        $user = User::factory()->create(['approval_status' => 'approved', 'agency_id' => $agency->id]);
        $user->assignRole('matchmaker');

        return $user;
    }

    private function profileUser(User $matchmaker, string $status, array $attributes = [], bool $completed = true): User
    {
        $user = User::factory()->create(array_merge(['status' => $status, 'assigned_matchmaker_id' => $matchmaker->id], $attributes));
        $user->assignRole('user');
        Profile::create(['user_id' => $user->id, 'account_status' => 'active'])
            ->forceFill(['is_completed' => $completed])->save();

        return $user;
    }

    private function pair(User $creator, User $a, User $b, string $status): void
    {
        $pairId = (string) Str::uuid();
        foreach ([$a, $b] as $recipient) {
            Proposition::create([
                'matchmaker_id' => $creator->id, 'pair_id' => $pairId,
                'reference_user_id' => $a->id, 'compatible_user_id' => $b->id, 'recipient_user_id' => $recipient->id,
                'user_a_id' => $a->id, 'user_b_id' => $b->id, 'message' => 'P', 'status' => $status,
            ]);
        }
    }

    private function rdv(User $organiser, User $a, User $b, string $status = 'en_cours'): void
    {
        Rdv::create([
            'matchmaker_id' => $organiser->id, 'reference_user_id' => $a->id, 'compatible_user_id' => $b->id,
            'regle' => 'test', 'share_phone' => false, 'status' => $status,
        ]);
    }

    private function sidebarStats(User $viewer)
    {
        return $this->actingAs($viewer)->get(route('staff.news-feed'));
    }

    public function test_a_proposition_sent_to_both_profiles_counts_once_and_main_figure_is_pending(): void
    {
        $a = $this->profileUser($this->mm, 'member');
        $b = $this->profileUser($this->mm, 'member');
        $this->pair($this->mm, $a, $b, 'pending');
        $c = $this->profileUser($this->mm, 'member');
        $this->pair($this->mm, $a, $c, 'closed');

        $stats = app(StatsService::class)->compute($this->mm, now()->month, now()->year, 'personal', null, null);

        $this->assertSame(1, $stats['propositions']['new_this_month']); // waiting for an answer
        $this->assertSame(1, $stats['propositions']['total_active']);   // closed is not "en cours"
    }

    public function test_news_feed_counters_reflect_real_rdvs_and_propositions(): void
    {
        $client = $this->profileUser($this->mm, 'client');
        $counterpart = $this->profileUser($this->other, 'client');
        $this->rdv($this->mm, $client, $counterpart);                 // mine, in progress
        $this->rdv($this->other, $counterpart, $this->profileUser($this->other, 'member')); // not mine

        $awaiting = $this->profileUser($this->mm, 'member');
        $this->pair($this->mm, $awaiting, $this->profileUser($this->other, 'member'), 'interested');

        $untreated = $this->profileUser($this->mm, 'prospect');
        $this->profileUser($this->mm, 'prospect', ['is_traite' => true]);

        $unpaid = $this->profileUser($this->mm, 'member');
        Bill::create([
            'bill_number' => 'FAC-1', 'user_id' => $unpaid->id, 'profile_id' => $unpaid->profile->id,
            'matchmaker_id' => $this->mm->id, 'order_number' => 'CMD-1', 'bill_date' => now()->toDateString(),
            'due_date' => now()->addMonth()->toDateString(), 'status' => 'unpaid', 'amount' => 1000, 'tax_rate' => 20,
            'tax_amount' => 200, 'total_amount' => 1200, 'currency' => 'MAD', 'payment_method' => 'Virement',
            'pack_name' => 'Pack', 'pack_price' => 1000, 'pack_advantages' => ['A'],
        ]);

        $this->sidebarStats($this->mm)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('statistics.activities.appointmentsInProgress', 1)
                ->where('statistics.activities.clientsAwaitingPayment', 1)
                ->where('statistics.clients.inAppointment', 1)
                ->where('statistics.clients.notInAppointment', 1)
                ->where('statistics.clients.untreatedProspects', 1)
                ->where('statistics.prospects.untreated', 1)
                ->missing('statistics.clients.notContacted')
            );

        // Each counter matches the list it links to.
        $this->actingAs($this->mm)->get('/staff/validated-prospects?status=en_rdv')
            ->assertInertia(fn (Assert $page) => $page->where('prospects.total', 1)->where('prospects.data.0.id', $client->id));
        $this->actingAs($this->mm)->get('/staff/validated-prospects?status=attente_rdv')
            ->assertInertia(fn (Assert $page) => $page->where('prospects.total', 1)->where('prospects.data.0.id', $awaiting->id));
        $this->actingAs($this->mm)->get('/staff/agency-prospects?status_filter=non_traite')
            ->assertInertia(fn (Assert $page) => $page->where('prospects.total', 1)->where('prospects.data.0.id', $untreated->id));
    }

    private function row(User $creator, User $ref, User $comp, User $recipient, string $status, ?string $pairId = null): void
    {
        Proposition::create([
            'matchmaker_id' => $creator->id, 'pair_id' => $pairId,
            'reference_user_id' => $ref->id, 'compatible_user_id' => $comp->id, 'recipient_user_id' => $recipient->id,
            'user_a_id' => $ref->id, 'user_b_id' => $comp->id, 'message' => 'P', 'status' => $status,
        ]);
    }

    private function assertAwaitingRdvCount(int $expected): void
    {
        $this->sidebarStats($this->mm)
            ->assertInertia(fn (Assert $page) => $page->where('statistics.clients.notInAppointment', $expected));
        $this->actingAs($this->mm)->get('/staff/validated-prospects?status=attente_rdv')
            ->assertInertia(fn (Assert $page) => $page->where('prospects.total', $expected));
    }

    public function test_awaiting_rdv_requires_both_members_to_have_accepted(): void
    {
        // Single-recipient proposition answered "yes" by its only recipient: the other member was never asked.
        $a = $this->profileUser($this->mm, 'member');
        $b = $this->profileUser($this->mm, 'member');
        $this->row($this->mm, $a, $b, $a, 'interested');
        $this->assertAwaitingRdvCount(0);

        // "Send to the other profile": first row still interested, second row pending.
        $pairId = (string) Str::uuid();
        $c = $this->profileUser($this->mm, 'member');
        $d = $this->profileUser($this->mm, 'member');
        $this->row($this->mm, $c, $d, $c, 'interested', $pairId);
        $this->row($this->mm, $c, $d, $d, 'pending', $pairId);
        $this->assertAwaitingRdvCount(0);

        // Both members accepted: both count, until an RDV exists for the pair.
        $e = $this->profileUser($this->mm, 'member');
        $f = $this->profileUser($this->mm, 'member');
        $this->pair($this->mm, $e, $f, 'interested');
        $this->assertAwaitingRdvCount(2);

        $this->rdv($this->mm, $f, $e); // either orientation
        $this->assertAwaitingRdvCount(0);
    }

    public function test_late_prospects_filter_matches_the_counter(): void
    {
        $late = $this->profileUser($this->mm, 'prospect', ['created_at' => now()->subDays(10)]);
        $this->profileUser($this->mm, 'prospect');
        $this->profileUser($this->mm, 'prospect', ['created_at' => now()->subDays(10), 'rejection_reason' => 'Injoignable']);

        $this->sidebarStats($this->mm)->assertInertia(fn (Assert $page) => $page->where('statistics.prospects.late', 1));
        $this->actingAs($this->mm)->get('/staff/agency-prospects?status_filter=en_retard')
            ->assertInertia(fn (Assert $page) => $page->where('prospects.total', 1)->where('prospects.data.0.id', $late->id));
    }

    public function test_agency_prospects_can_be_filtered_by_profile_completeness(): void
    {
        $complete = $this->profileUser($this->mm, 'prospect');
        $incomplete = $this->profileUser($this->mm, 'prospect', [], completed: false);
        $noProfile = User::factory()->create(['status' => 'prospect', 'assigned_matchmaker_id' => $this->mm->id]);
        $noProfile->assignRole('user');

        $this->actingAs($this->mm)->get('/staff/agency-prospects?filter=complete')
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileFilter', 'complete')
                ->where('prospects.total', 1)
                ->where('prospects.data.0.id', $complete->id));

        // Incomplete includes prospects with no profile yet (they cannot be validated either).
        $this->actingAs($this->mm)->get('/staff/agency-prospects?filter=incomplete')
            ->assertInertia(fn (Assert $page) => $page
                ->where('profileFilter', 'incomplete')
                ->where('prospects.total', 2));
        $ids = collect($this->actingAs($this->mm)->get('/staff/agency-prospects?filter=incomplete')->viewData('page')['props']['prospects']['data'])->pluck('id')->sort()->values()->all();
        $this->assertSame(collect([$incomplete->id, $noProfile->id])->sort()->values()->all(), $ids);

        // Combined with another filter, and "all" lists everyone.
        $this->actingAs($this->mm)->get('/staff/agency-prospects?filter=complete&status_filter=non_traite')
            ->assertInertia(fn (Assert $page) => $page->where('prospects.total', 1));
        $this->actingAs($this->mm)->get('/staff/agency-prospects')
            ->assertInertia(fn (Assert $page) => $page->where('profileFilter', 'all')->where('prospects.total', 3));
    }

    public function test_validation_is_refused_while_the_profile_is_incomplete(): void
    {
        $prospect = $this->profileUser($this->mm, 'prospect', [], completed: false);

        $this->actingAs($this->mm)
            ->postJson(route('staff.prospects.validate', $prospect->id), [])
            ->assertStatus(422)
            ->assertJsonPath('error', 'profile_incomplete')
            ->assertJsonPath('edit_url', '/staff/prospects/'.$prospect->id.'/profile/edit');

        $this->assertSame('prospect', $prospect->fresh()->status);
    }
}
