<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\MatrimonialPack;
use App\Models\Profile;
use App\Models\Proposition;
use App\Models\PropositionRequest;
use App\Models\Rdv;
use App\Models\TransferRequest;
use App\Models\User;
use App\Models\UserAssignment;
use App\Models\UserSubscription;
use App\Services\ObjectiveMetricsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * When a profile changes matchmaker, the previous matchmaker's propositions, RDVs, bills, subscriptions
 * and requests for that profile move to the new one (stats follow); a third matchmaker's do not.
 */
class ProfileOwnershipTransferTest extends TestCase
{
    use RefreshDatabase;

    private User $old;

    private User $new;

    private User $third;

    private User $x;      // transferred profile (Old -> New)

    private User $y;      // another of Old's members

    private User $z;      // a member of the third matchmaker

    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite' || config("database.connections.{$connection}.database") !== ':memory:') {
            throw new RuntimeException('ProfileOwnershipTransferTest only runs on the in-memory SQLite database.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->old = $this->staff();
        $this->new = $this->staff();
        $this->third = $this->staff();
        $this->x = $this->member($this->old, 'male');
        $this->y = $this->member($this->old, 'female');
        $this->z = $this->member($this->third, 'female');
        UserAssignment::recordAssignment($this->x->id, $this->old->id, null, 'initial');
    }

    private function staff(): User
    {
        $user = User::factory()->create(['approval_status' => 'approved']);
        $user->assignRole('matchmaker');

        return $user;
    }

    private function member(User $matchmaker, string $gender): User
    {
        $user = User::factory()->create(['status' => 'member', 'gender' => $gender, 'assigned_matchmaker_id' => $matchmaker->id]);
        $user->assignRole('user');
        Profile::create(['user_id' => $user->id, 'account_status' => 'active']);

        return $user;
    }

    private function proposition(User $creator, User $reference, User $compatible, string $status = 'interested'): Proposition
    {
        return Proposition::create([
            'matchmaker_id' => $creator->id,
            'reference_user_id' => $reference->id,
            'compatible_user_id' => $compatible->id,
            'recipient_user_id' => $compatible->id,
            'user_a_id' => $reference->id,
            'user_b_id' => $compatible->id,
            'message' => 'Proposition',
            'status' => $status,
        ]);
    }

    private function rdv(User $creator, User $reference, User $compatible, string $status = 'en_cours'): Rdv
    {
        return Rdv::create([
            'matchmaker_id' => $creator->id,
            'reference_user_id' => $reference->id,
            'compatible_user_id' => $compatible->id,
            'regle' => 'test',
            'share_phone' => false,
            'status' => $status,
        ]);
    }

    private function bill(User $member, User $matchmaker): Bill
    {
        return Bill::create([
            'bill_number' => 'FAC-'.fake()->unique()->numerify('#####'),
            'user_id' => $member->id,
            'profile_id' => $member->profile->id,
            'matchmaker_id' => $matchmaker->id,
            'order_number' => 'CMD-'.fake()->unique()->numerify('#####'),
            'bill_date' => now()->toDateString(),
            'due_date' => now()->addMonth()->toDateString(),
            'status' => 'paid',
            'amount' => 1000,
            'tax_rate' => 20,
            'tax_amount' => 200,
            'total_amount' => 1200,
            'currency' => 'MAD',
            'payment_method' => 'Virement',
            'pack_name' => 'Pack',
            'pack_price' => 1000,
            'pack_advantages' => ['Accompagnement'],
        ]);
    }

    private function transferXToNew(): void
    {
        $this->actingAs($this->old)
            ->post(route('staff.transfer-requests.create'), ['user_id' => $this->x->id, 'to_matchmaker_id' => $this->new->id])
            ->assertRedirect();

        $this->actingAs($this->new)
            ->post(route('staff.transfer-requests.accept', TransferRequest::firstOrFail()->id))
            ->assertRedirect();

        $this->assertSame($this->new->id, (int) $this->x->fresh()->assigned_matchmaker_id);
    }

    public function test_transfer_moves_the_previous_matchmakers_history_but_not_a_third_matchmakers(): void
    {
        $caseB = $this->proposition($this->old, $this->x, $this->y);   // both profiles were Old's
        $caseA = $this->proposition($this->old, $this->x, $this->z);   // other profile is the third's
        $caseC = $this->proposition($this->third, $this->z, $this->x); // created by the third matchmaker
        $unrelated = $this->proposition($this->old, $this->y, $this->z); // does not involve X

        $rdvOld = $this->rdv($this->old, $this->x, $this->y);
        $rdvThird = $this->rdv($this->third, $this->z, $this->x);
        $bill = $this->bill($this->x, $this->old);
        $pack = MatrimonialPack::create(['name' => 'Pack', 'duration' => 6]);
        $subscription = UserSubscription::create([
            'user_id' => $this->x->id,
            'matrimonial_pack_id' => $pack->id,
            'assigned_matchmaker_id' => $this->old->id,
            'subscription_start' => now()->toDateString(),
            'subscription_end' => now()->addMonths(6)->toDateString(),
            'duration_months' => 6,
            'pack_price' => 1000,
            'pack_advantages' => ['Support'],
            'payment_mode' => 'Virement',
            'status' => 'active',
        ]);
        $sentByOld = PropositionRequest::create([
            'reference_user_id' => $this->x->id, 'compatible_user_id' => $this->z->id,
            'from_matchmaker_id' => $this->old->id, 'to_matchmaker_id' => $this->third->id,
            'message' => 'Bonjour', 'status' => 'pending',
        ]);
        $receivedByOld = PropositionRequest::create([
            'reference_user_id' => $this->z->id, 'compatible_user_id' => $this->x->id,
            'from_matchmaker_id' => $this->third->id, 'to_matchmaker_id' => $this->old->id,
            'message' => 'Bonjour', 'status' => 'pending',
        ]);

        $this->transferXToNew();

        $this->assertSame($this->new->id, (int) $caseB->fresh()->matchmaker_id);
        $this->assertSame($this->new->id, (int) $caseA->fresh()->matchmaker_id);
        $this->assertSame($this->third->id, (int) $caseC->fresh()->matchmaker_id);
        $this->assertSame($this->old->id, (int) $unrelated->fresh()->matchmaker_id);
        $this->assertSame($this->new->id, (int) $rdvOld->fresh()->matchmaker_id);
        $this->assertSame($this->third->id, (int) $rdvThird->fresh()->matchmaker_id);
        $this->assertSame($this->new->id, (int) $bill->fresh()->matchmaker_id);
        $this->assertSame($this->new->id, (int) $subscription->fresh()->assigned_matchmaker_id);
        $this->assertSame($this->new->id, (int) $sentByOld->fresh()->from_matchmaker_id);
        $this->assertSame($this->new->id, (int) $receivedByOld->fresh()->to_matchmaker_id);

        $this->assertDatabaseHas('user_activities', [
            'user_id' => $this->x->id,
            'type' => 'matchmaker_assigned',
            'performed_by' => $this->new->id,
        ]);
    }

    public function test_stats_follow_the_profile_and_keep_their_original_month(): void
    {
        $lastMonth = now()->subMonthNoOverflow();
        $match = $this->rdv($this->old, $this->x, $this->y, 'reussi');
        $bill = $this->bill($this->x, $this->old);
        DB::table('rdvs')->where('id', $match->id)->update(['created_at' => $lastMonth, 'updated_at' => $lastMonth]);
        DB::table('bills')->where('id', $bill->id)->update(['created_at' => $lastMonth]);

        $before = ObjectiveMetricsService::calculateRealizedForMatchmaker($this->old->id, $lastMonth->month, $lastMonth->year);
        $this->assertSame(1, $before['match']);
        $this->assertSame(1200.0, $before['ventes']);

        $this->transferXToNew();

        $old = ObjectiveMetricsService::calculateRealizedForMatchmaker($this->old->id, $lastMonth->month, $lastMonth->year);
        $new = ObjectiveMetricsService::calculateRealizedForMatchmaker($this->new->id, $lastMonth->month, $lastMonth->year);
        $this->assertSame(0, $old['match']);
        $this->assertSame(0.0, $old['ventes']);
        $this->assertSame(1, $new['match']);
        $this->assertSame(1, $new['rdv']);
        $this->assertSame(1200.0, $new['ventes']);

        // Dates untouched: the match still counts in its original month, not this one.
        $this->assertSame($lastMonth->toDateTimeString(), $match->fresh()->updated_at->toDateTimeString());
    }

    public function test_activation_takeover_moves_the_history_too(): void
    {
        $proposition = $this->proposition($this->old, $this->x, $this->y, 'cancelled');
        $this->x->profile->update(['account_status' => 'desactivated']);

        $this->actingAs($this->new)
            ->post(route('staff.users.activate', $this->x->id), ['reason' => 'Retour du membre'])
            ->assertRedirect();

        $this->assertSame($this->new->id, (int) $proposition->fresh()->matchmaker_id);
    }

    public function test_reassignment_after_the_agency_pool_moves_from_the_last_matchmaker(): void
    {
        $proposition = $this->proposition($this->old, $this->x, $this->y);

        // Sent back to the pool (no matchmaker), then assigned to New.
        UserAssignment::recordUnassignment($this->x->id);
        $this->x->update(['assigned_matchmaker_id' => $this->new->id]);
        UserAssignment::recordAssignment($this->x->id, $this->new->id, null, 'initial');

        $this->assertSame($this->new->id, (int) $proposition->fresh()->matchmaker_id);
    }

    public function test_first_assignment_moves_nothing(): void
    {
        $prospect = User::factory()->create(['status' => 'prospect']);
        $prospect->assignRole('user');
        $unrelated = $this->proposition($this->old, $this->y, $this->z);

        UserAssignment::recordAssignment($prospect->id, $this->new->id, null, 'initial');

        $this->assertSame($this->old->id, (int) $unrelated->fresh()->matchmaker_id);
        $this->assertDatabaseMissing('user_activities', ['user_id' => $prospect->id, 'type' => 'matchmaker_assigned']);
    }

    public function test_a_request_never_becomes_a_request_to_oneself(): void
    {
        $newMember = $this->member($this->new, 'female');
        $toNew = PropositionRequest::create([
            'reference_user_id' => $this->x->id, 'compatible_user_id' => $newMember->id,
            'from_matchmaker_id' => $this->old->id, 'to_matchmaker_id' => $this->new->id,
            'message' => 'Bonjour', 'status' => 'pending',
        ]);

        $this->transferXToNew();

        $this->assertSame($this->old->id, (int) $toNew->fresh()->from_matchmaker_id);
    }
}
