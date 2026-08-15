<?php

namespace Tests\Feature;

use App\Mail\ClientWelcomeMail;
use App\Models\Bill;
use App\Models\MatrimonialPack;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MarkAsClientTest extends TestCase
{
    use RefreshDatabase;

    private User $matchmaker;

    private User $member;

    private Profile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->matchmaker = User::factory()->create([
            'approval_status' => 'approved',
        ]);
        $this->matchmaker->assignRole('matchmaker');

        $this->member = User::factory()->create([
            'status' => 'member',
            'assigned_matchmaker_id' => $this->matchmaker->id,
        ]);
        $this->member->assignRole('user');

        $pack = MatrimonialPack::create([
            'name' => 'Pack Sérénité',
            'duration' => 6,
        ]);

        $this->profile = Profile::create([
            'user_id' => $this->member->id,
            'matrimonial_pack_id' => $pack->id,
            'pack_price' => 1000,
            'pack_advantages' => ['Accompagnement personnalisé'],
            'payment_mode' => 'Virement',
        ]);
    }

    public function test_paid_bill_cannot_be_marked_paid_even_by_admin(): void
    {
        $admin = User::factory()->create(['approval_status' => 'approved']);
        $admin->assignRole('admin');

        $bill = $this->createBill('paid');

        $this->assertFalse($admin->can('markPaid', $bill));
    }

    public function test_mark_as_client_refuses_member_without_unpaid_bill(): void
    {
        Mail::fake();
        $this->createBill('paid');

        $this->actingAs($this->matchmaker)
            ->post(route('staff.mark-as-client'), ['user_id' => $this->member->id])
            ->assertRedirect()
            ->assertSessionHas('error', 'Ce membre n\'a aucune facture en attente.');

        $this->assertDatabaseHas('users', [
            'id' => $this->member->id,
            'status' => 'member',
        ]);
        $this->assertDatabaseCount('user_subscriptions', 0);
        Mail::assertNothingSent();
    }

    public function test_mark_as_client_pays_captured_bills_and_sends_one_welcome_email(): void
    {
        Mail::fake();

        $olderBill = $this->createBill('unpaid', now()->subMinute());
        $currentBill = $this->createBill('unpaid', now());

        $this->actingAs($this->matchmaker)
            ->post(route('staff.mark-as-client'), ['user_id' => $this->member->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('users', [
            'id' => $this->member->id,
            'status' => 'client',
        ]);
        $this->assertDatabaseHas('bills', ['id' => $olderBill->id, 'status' => 'paid']);
        $this->assertDatabaseHas('bills', ['id' => $currentBill->id, 'status' => 'paid']);
        $this->assertDatabaseCount('user_subscriptions', 1);

        $statusChange = UserActivity::where('user_id', $this->member->id)
            ->where('type', 'status_change')
            ->first();

        $this->assertNotNull($statusChange);
        $this->assertSame('Statut passé de member à client.', $statusChange->description);
        $this->assertSame('member', $statusChange->metadata['previous_status']);
        $this->assertSame('client', $statusChange->metadata['new_status']);
        $this->assertSame($this->matchmaker->id, $statusChange->performed_by);

        Mail::assertSent(ClientWelcomeMail::class, function (ClientWelcomeMail $mail) use ($olderBill, $currentBill) {
            return $mail->hasTo($this->member->email)
                && collect($mail->paidBills)->pluck('id')->all() === [$currentBill->id, $olderBill->id]
                && count($mail->attachments()) === 2;
        });
        Mail::assertSent(ClientWelcomeMail::class, 1);
    }

    public function test_mark_as_client_sent_message_includes_pdf_attachment_bytes(): void
    {
        $bill = $this->createBill('unpaid');
        $attachmentSizes = [];

        Event::listen(MessageSent::class, function (MessageSent $event) use (&$attachmentSizes) {
            foreach ($event->message->getAttachments() as $attachment) {
                $attachmentSizes[] = strlen($attachment->getBody());
            }
        });

        $this->actingAs($this->matchmaker)
            ->post(route('staff.mark-as-client'), ['user_id' => $this->member->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertCount(1, $attachmentSizes);
        $this->assertGreaterThan(1000, $attachmentSizes[0]);
    }

    public function test_mail_failure_does_not_undo_client_activation(): void
    {
        $bill = $this->createBill('unpaid');
        Log::spy();
        Mail::shouldReceive('to')
            ->once()
            ->with($this->member->email)
            ->andThrow(new \RuntimeException('SMTP unavailable'));

        $this->actingAs($this->matchmaker)
            ->post(route('staff.mark-as-client'), ['user_id' => $this->member->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('users', [
            'id' => $this->member->id,
            'status' => 'client',
        ]);
        $this->assertDatabaseHas('bills', [
            'id' => $bill->id,
            'status' => 'paid',
        ]);
        $this->assertDatabaseCount('user_subscriptions', 1);
        Log::shouldHaveReceived('error')
            ->once()
            ->withArgs(fn (string $message, array $context) => $message === 'Failed to send client welcome email.'
                && $context['user_id'] === $this->member->id
                && $context['bill_ids'] === [$bill->id]
                && $context['exception'] instanceof \RuntimeException);
    }

    public function test_latest_bill_relationship_uses_creation_time_then_id(): void
    {
        $this->createBill('unpaid', now()->subDay());
        $latest = $this->createBill('paid', now());

        $this->assertSame($latest->id, $this->member->latestBill()->first()?->id);
        $this->assertSame('paid', $this->member->latestBill()->first()?->status);
    }

    private function createBill(string $status, $createdAt = null): Bill
    {
        $bill = Bill::create([
            'bill_number' => 'FAC-TEST-'.fake()->unique()->numerify('###'),
            'user_id' => $this->member->id,
            'profile_id' => $this->profile->id,
            'matchmaker_id' => $this->matchmaker->id,
            'order_number' => 'CMD-TEST-'.fake()->unique()->numerify('###'),
            'bill_date' => now()->toDateString(),
            'due_date' => now()->addMonth()->toDateString(),
            'status' => $status,
            'amount' => 1000,
            'tax_rate' => 20,
            'tax_amount' => 200,
            'total_amount' => 1200,
            'currency' => 'MAD',
            'payment_method' => 'Virement',
            'pack_name' => 'Pack Sérénité',
            'pack_price' => 1000,
            'pack_advantages' => ['Accompagnement personnalisé'],
        ]);

        if ($createdAt) {
            $bill->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->save();
        }

        return $bill;
    }
}
