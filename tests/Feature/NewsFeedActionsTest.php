<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Agency;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\Profile;
use App\Models\Proposition;
use App\Models\User;
use App\Models\UserAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * News feed: deleting comments (assigned profiles only), "S'affecter" on prospect comments,
 * and new RDVs posted to the feed with links to both profiles.
 */
class NewsFeedActionsTest extends TestCase
{
    use RefreshDatabase;

    private Agency $agency;

    private User $mm;

    private User $otherMm;

    private Post $post;

    protected function beforeRefreshingDatabase()
    {
        $connection = config('database.default');
        if ($connection !== 'sqlite' || config("database.connections.{$connection}.database") !== ':memory:') {
            throw new RuntimeException('NewsFeedActionsTest only runs on the in-memory SQLite database.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'manager', 'matchmaker', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }
        $this->agency = Agency::create(['name' => 'Agence', 'country' => 'MA', 'city' => 'Casablanca', 'address' => '1 Rue']);
        $this->mm = $this->staff('matchmaker');
        $this->otherMm = $this->staff('matchmaker', Agency::create(['name' => 'Autre', 'country' => 'MA', 'city' => 'Rabat', 'address' => '2 Rue']));
        $this->post = Post::create(['user_id' => $this->mm->id, 'content' => 'Bonjour', 'type' => 'text']);
    }

    private function staff(string $role, ?Agency $agency = null): User
    {
        $user = User::factory()->create(['approval_status' => 'approved', 'agency_id' => ($agency ?? $this->agency)->id]);
        $user->assignRole($role);

        return $user;
    }

    private function profileUser(?User $matchmaker, string $status = 'member', array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'status' => $status,
            'assigned_matchmaker_id' => $matchmaker?->id,
        ], $attributes));
        $user->assignRole('user');
        Profile::create(['user_id' => $user->id, 'account_status' => 'active'])->forceFill(['is_completed' => true])->save();

        return $user;
    }

    private function commentBy(User $author): PostComment
    {
        return PostComment::create(['post_id' => $this->post->id, 'user_id' => $author->id, 'content' => 'Un commentaire']);
    }

    public function test_matchmakers_delete_only_comments_of_their_assigned_profiles(): void
    {
        $mine = $this->commentBy($this->profileUser($this->mm));
        $theirs = $this->commentBy($this->profileUser($this->otherMm));

        $this->actingAs($this->mm)->delete(route('posts.comments.delete', $theirs))->assertForbidden();
        $this->assertDatabaseHas('post_comments', ['id' => $theirs->id]);

        $this->actingAs($this->mm)->delete(route('posts.comments.delete', $mine))->assertRedirect();
        $this->assertDatabaseMissing('post_comments', ['id' => $mine->id]);
    }

    public function test_managers_delete_comments_of_profiles_in_their_agency_and_admins_any(): void
    {
        $manager = $this->staff('manager');
        $inAgency = $this->commentBy($this->profileUser($this->mm, 'member', ['agency_id' => $this->agency->id]));
        $outside = $this->commentBy($this->profileUser($this->otherMm));

        $this->actingAs($manager)->delete(route('posts.comments.delete', $outside))->assertForbidden();
        $this->actingAs($manager)->delete(route('posts.comments.delete', $inAgency))->assertRedirect();
        $this->assertDatabaseMissing('post_comments', ['id' => $inAgency->id]);

        $admin = $this->staff('admin');
        $this->actingAs($admin)->delete(route('posts.comments.delete', $outside))->assertRedirect();
        $this->assertDatabaseMissing('post_comments', ['id' => $outside->id]);
    }

    public function test_any_matchmaker_can_take_an_unassigned_prospect_once(): void
    {
        $prospect = $this->profileUser(null, 'prospect');

        $this->actingAs($this->otherMm)
            ->postJson(route('staff.prospects.self-assign', $prospect))
            ->assertOk()
            ->assertJsonPath('assigned_matchmaker.id', $this->otherMm->id);

        $this->assertSame($this->otherMm->id, (int) $prospect->fresh()->assigned_matchmaker_id);
        $this->assertDatabaseHas('user_assignments', [
            'user_id' => $prospect->id, 'matchmaker_id' => $this->otherMm->id, 'reason' => 'self_assigned', 'unassigned_at' => null,
        ]);

        // Second matchmaker: refused, told who took it; nothing changes.
        $this->actingAs($this->mm)
            ->postJson(route('staff.prospects.self-assign', $prospect))
            ->assertStatus(409)
            ->assertJsonPath('assigned_matchmaker.id', $this->otherMm->id);
        $this->assertSame(1, UserAssignment::where('user_id', $prospect->id)->count());
    }

    public function test_self_assign_is_only_for_prospects(): void
    {
        $member = $this->profileUser(null, 'member');

        $this->actingAs($this->mm)->postJson(route('staff.prospects.self-assign', $member))->assertStatus(422);
        $this->assertNull($member->fresh()->assigned_matchmaker_id);
    }

    public function test_comment_payload_carries_the_prospect_matchmaker_for_the_assigned_label(): void
    {
        $prospect = $this->profileUser($this->otherMm, 'prospect');
        $this->commentBy($prospect);

        $this->actingAs($this->mm)
            ->get(route('staff.news-feed'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('feed.data.0.post.comments.0.user.assigned_matchmaker.name', $this->otherMm->name));
    }

    public function test_a_new_rdv_is_posted_to_the_feed_with_both_profiles(): void
    {
        $a = $this->profileUser($this->mm, 'member', ['name' => 'Eden Short', 'username' => 'eden-short']);
        $b = $this->profileUser($this->mm, 'member', ['name' => 'Darrel Murray', 'username' => 'darrel-murray']);
        $pairId = (string) Str::uuid();
        foreach ([$a, $b] as $recipient) {
            $row = Proposition::create([
                'matchmaker_id' => $this->mm->id, 'pair_id' => $pairId,
                'reference_user_id' => $a->id, 'compatible_user_id' => $b->id, 'recipient_user_id' => $recipient->id,
                'user_a_id' => $a->id, 'user_b_id' => $b->id, 'message' => 'P',
                'status' => 'interested', 'user_response' => 'interested', 'responded_at' => now(),
            ]);
        }

        $this->actingAs($this->mm)->postJson(route('staff.rdv.store'), ['proposition_id' => $row->id])->assertSuccessful();

        $activity = Activity::where('type', 'rdv.created')->firstOrFail();
        $this->assertSame(['eden-short', 'darrel-murray'], collect($activity->metadata['profiles'])->pluck('username')->all());

        $feed = $this->actingAs($this->mm)->get(route('staff.news-feed'))->viewData('page')['props']['feed']['data'];
        $item = collect($feed)->first(fn ($entry) => ($entry['activity']['type'] ?? null) === 'rdv.created');

        $this->assertNotNull($item, 'The RDV activity should appear in the news feed.');
        $this->assertSame('Nouveau RDV : Eden Short et Darrel Murray', $item['activity']['description']);
        $this->assertSame(['eden-short', 'darrel-murray'], collect($item['activity']['description_display']['profiles'])->pluck('username')->all());
    }

    public function test_new_prospect_and_member_activities_link_to_the_profile(): void
    {
        $prospect = $this->profileUser($this->mm, 'prospect', ['name' => 'Nadia B', 'username' => 'nadia-b']);
        $member = $this->profileUser($this->mm, 'member', ['name' => 'Karim B', 'username' => 'karim-b']);
        Activity::record('prospect.added', $this->mm->id, $prospect);
        Activity::record('member.added', $this->mm->id, $member);

        $feed = collect($this->actingAs($this->mm)->get(route('staff.news-feed'))->viewData('page')['props']['feed']['data']);
        $profilesFor = fn (string $type) => $feed->first(fn ($e) => ($e['activity']['type'] ?? null) === $type)['activity']['description_display']['profiles'];

        $this->assertSame([['name' => 'Nadia B', 'username' => 'nadia-b']], $profilesFor('prospect.added'));
        $this->assertSame([['name' => 'Karim B', 'username' => 'karim-b']], $profilesFor('member.added'));
    }
}
