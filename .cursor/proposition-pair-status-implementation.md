# Pair-synchronized `propositions.status` — implementation guide

Apply when **Agent mode** is on (Plan mode cannot edit non-markdown files).

## Rules (from product spec)

| User A `user_response` | User B `user_response` | All rows `status` |
|------------------------|------------------------|---------------------|
| interested | interested | interested |
| interested | not_interested | not_interested |
| not_interested | interested | not_interested |
| not_interested | not_interested | not_interested |
| interested | (null / not answered) | pending |

- Per-row: `user_response`, `user_comment`, `response_message`, `responded_at` only on rows where that recipient answered.
- **All rows in the same `pair_id`** get the **same** `status` after each `respond`.
- **No `pair_id`** (single recipient): one row behaves as today — after respond, `status` is `interested` or `not_interested` immediately (same formulas with a collection of one row).

## 1. [app/Models/Proposition.php](app/Models/Proposition.php)

Add `use Illuminate\Support\Collection;` and paste after `scopePairedWith` (before `matchmaker()`):

```php
    /**
     * Rows that share the same pair_id, or only this row when pair_id is null.
     *
     * @return Collection<int, Proposition>
     */
    public function rowsInSamePair(): Collection
    {
        if ($this->pair_id === null || $this->pair_id === '') {
            return new Collection([$this]);
        }

        return static::query()
            ->where('pair_id', $this->pair_id)
            ->orderBy('id')
            ->get();
    }

    public static function isPositiveUserResponse(?string $value): bool
    {
        return in_array($value, [self::STATUS_INTERESTED, self::STATUS_ACCEPTED], true);
    }

    public static function isNegativeUserResponse(?string $value): bool
    {
        return in_array($value, [self::STATUS_NOT_INTERESTED, 'rejected'], true);
    }

    /**
     * Shared status for all rows in a pair: any refusal wins; mutual interest only when every row has answered positively; otherwise pending.
     *
     * @param  Collection<int, Proposition>  $rows
     */
    public static function computeSyncedPairStatus(Collection $rows): string
    {
        if ($rows->isEmpty()) {
            return self::STATUS_PENDING;
        }

        if ($rows->contains(fn (Proposition $p) => self::isNegativeUserResponse($p->user_response))) {
            return self::STATUS_NOT_INTERESTED;
        }

        $allAnsweredPositive = $rows->every(function (Proposition $p) {
            return $p->responded_at !== null && self::isPositiveUserResponse($p->user_response);
        });

        if ($allAnsweredPositive) {
            return self::STATUS_INTERESTED;
        }

        return self::STATUS_PENDING;
    }
```

## 2. [app/Http/Controllers/PropositionController.php](app/Http/Controllers/PropositionController.php) — `respond()`

**User guard** (replace the block that checks `status !== 'pending'` for users only):

```php
        if ($canRespondAsUser && (
            $proposition->status !== Proposition::STATUS_PENDING
            || $proposition->responded_at !== null
        )) {
            return response()->json([
                'message' => 'Proposition already responded.',
            ], 422);
        }
```

**Lazy expiry** — replace the single-row `update(['status' => 'expired'])` block with a transaction that:

- Locks `Proposition::query()->whereKey($proposition->id)->lockForUpdate()->first()` (or reload inside transaction).
- If `$proposition->pair_id`: `Proposition::query()->where('pair_id', $proposition->pair_id)->where('status', Proposition::STATUS_PENDING)->lockForUpdate()->get()` and expire **each** (same `created_at` rule: only expire rows that are actually stale; simplest is “expire this row if stale; if pair_id, also expire other **pending** rows in the pair” so both stay aligned).
- Log `proposition_expired` per expired row.

**After `$data` validation** — replace the single `update` that sets `status` + `user_response` with one `DB::transaction` that:

1. Locks the answered proposition by id (`lockForUpdate`).
2. `$pairRows = $locked->pair_id ? Proposition::query()->where('pair_id', $locked->pair_id)->orderBy('id')->lockForUpdate()->get() : collect([$locked]);`
3. Find `$target = $pairRows->firstWhere('id', $locked->id)` and run `$target->update([...])` with `user_response`, `user_comment`, `response_message`, `responded_at` (no `status` yet).
4. `$fresh = Proposition::query()->whereIn('id', $pairRows->pluck('id'))->orderBy('id')->get();`
5. `$newStatus = Proposition::computeSyncedPairStatus($fresh);`
6. `foreach ($fresh as $r) { if ($r->status !== $newStatus) { $r->update(['status' => $newStatus]); } }`
7. `UserActivityService::log` using `$newStatus` as `new_status` in meta; `previous_status` captured from `$locked->status` before the answer update.

**Return** `Proposition::query()->find($proposition->id)` for `status` in JSON.

## 3. [app/Console/Commands/ExpirePropositions.php](app/Console/Commands/ExpirePropositions.php)

When expiring a pending row past cutoff:

- After updating it to `expired` + log, if `pair_id` is set, find other rows `where('pair_id', $pid)->where('status','pending')` and expire each + log (avoid double-processing the same id in one iteration).

## 4. [app/Services/MatchmakingResultsPayloadService.php](app/Services/MatchmakingResultsPayloadService.php)

Line ~115: only set `pending_response_proposition` when:

- `$prop->status === 'pending'`
- **`$prop->responded_at === null`** (recipient has not submitted yet)
- existing recipient / MM checks unchanged.

## 5. Tests

- **New** `tests/Feature/PropositionPairSyncRespondTest.php` (or similar):
  - Two users + matchmaker; two `Proposition` rows, same `pair_id`, different `recipient_user_id`.
  - User A `accepted` on row A → both `status` `pending`; A has `user_response` interested + `responded_at`; B `user_response` null.
  - User B `accepted` on row B → both `status` `interested`.
  - Fresh pair: A rejects (message) → both `not_interested`.
  - Fresh pair: A accepts, B rejects → both `not_interested`.
- Run `php artisan test --filter=Proposition`.

## 6. No migration

Uses existing `user_response`, `responded_at`, `pair_id`, `status`.

---

`pendingResponsePropositionIdForRecipient` already requires `responded_at === null`, so partial pair (both `pending`, one answered) still resolves correctly for “who owes a reply.”
