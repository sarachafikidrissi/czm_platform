# Plan — Identity documents (CIN) private and access-controlled

Status: **not started** — plan only, to be executed later on a feature branch (never on `main`).
Prepared: 2026-10-28.

---

## 1. Why

Identity documents are handled in two unsafe ways today.

**A. The data is sent to people who should not get it (most urgent).**
`Profile` has no `$hidden`, so every time a full profile is sent to the browser it carries
`cin` (encrypted), `cin_hash`, `identity_card_front_path` and `identity_card_front_hash`.
Full profiles are sent in many places that have nothing to do with identity checks:

| Where | Who receives it |
|---|---|
| `PostController` (news feed, lines ~36–41, ~361–367, ~412–418, 217): `user.profile`, `likes.user.profile`, `comments.user.profile`, `replies.user.profile` | **every member who can see the feed** — they get the identity data of every poster, liker and commenter |
| `UserController::profile` (`'profile' => $user->profile`, ~line 677) and the posts on that page | **any logged-in user** opening `/profile/{username}` |
| `UserController::profile` proposition snapshot (`referenceUser->profile`, `compatibleUser->profile`, ~lines 257/263) | staff on the profile page |
| Prospect lists in `MatchmakerController` (~lines 171, 1060, 1784) also add **`cin_decrypted`** (the CIN number in clear) for every prospect listed | every staff member allowed to see the list, not only the one who validates |

(The matchmaking cards were already fixed: `MatchmakingResultsPayloadService::cardProfile()`.)

**B. The files are public.**
Images are stored with `store('identity-cards', 'public')` → served from `/storage/identity-cards/<random>.jpg`
with **no login check**. File names are random (not guessable), but anyone who gets a link
(history, forwarded link, logs, the leaks in A) can open it forever.

## 2. Goal

1. Identity data is only sent to screens that need it, and only to viewers allowed to see it.
2. Identity files live on the private disk and are served by an authorised route.
3. Existing files are moved without losing anything, with a safe rollback window.

## 3. Inventory (everything that must change)

**Writes / deletes (`'public'` disk → private):**
- `ProfileController.php` ~471–478 and ~536–555 (member onboarding / profile-info, step 4) — store + delete
- `MatchmakerController.php` ~364–374 (validate prospect), ~1213–1221 (update validation info), ~2760–2766 (edit prospect profile) — store + delete (some deletes use `storage_path('app/public/...')`)
- `AdminController.php` ~501–512 (create staff: front **and back**, saved on `users.identity_card_front_path/back_path`)
- `app/Console/Commands/ClearStorageCommand.php` line 32 (`deleteDirectory('identity-cards')`)

**Reads / display (`/storage/${path}` in the browser):**
- `resources/js/components/prospect-profile-actions-modals.jsx` ~198–226 (validation modal)
- `resources/js/pages/matchmaker/prospects.jsx` ~680–707
- `resources/js/pages/profile/uploadPicture.jsx` ~349–366 (member step 4)
- `resources/js/pages/matchmaker/edit-prospect-profile.jsx` + `profile-info.jsx` (`identityCardFrontPath` passed down to `uploadPicture.jsx`)
- Server props: `ProfileController` ~99, `MatchmakerController` ~2345 (`identityCardFrontPath`)

**No database migration is needed**: paths stay `identity-cards/<name>`, only the disk changes.

## 4. Decisions to confirm before starting

| # | Question | Suggested answer |
|---|---|---|
| D1 | Who may view a member/prospect's identity document? | The person themself; admin; the assigned matchmaker; a manager of the profile's agency (same rule as "Modifier le profil" / validation). |
| D2 | Who may view a **staff** member's ID card (created by admin)? | Admin only (and the staff member themself). |
| D3 | Should prospect lists still show the CIN number in clear (`cin_decrypted`)? | Only inside the validation modal, loaded on demand for the viewer allowed to validate — not in the list payload. |
| D4 | After moving files, how long to keep the public copies before deleting them? | 2 weeks (rollback window). |

## 5. Phases

### Phase 1 — Stop sending identity data where it is not needed (small, do first)
1. `Profile::$hidden = ['cin', 'cin_hash', 'identity_card_front_path', 'identity_card_front_hash']`.
2. `User::$hidden` += `cin_hash`, `identity_card_front_hash`, `identity_card_back_hash`, `identity_card_front_path`, `identity_card_back_path`.
3. Screens that legitimately need them read them explicitly (they already do for `identityCardFrontPath`).
   For the prospect validation modal: expose `has_identity_card` (bool) + the URL from Phase 2, and only for viewers allowed to validate (`UserProfileActionPolicy::validateProspect`).
4. Remove `cin_decrypted` from list payloads; the validation modal fetches it from a small authorised endpoint when opened (D3).
5. Tests: news feed, `/profile/{username}`, prospect lists → JSON has none of the fields; edit page / validation still work for authorised viewers.

Risk: any screen that silently relied on these fields breaks → grep above is the checklist; verify each screen manually.

### Phase 2 — Private storage + authorised route (code only, files not moved yet)
1. `App\Support\IdentityDocumentStorage` (one place for all disk logic):
   - `store(UploadedFile $file): string` → `$file->store('identity-cards', 'local')`
   - `delete(?string $path)` → deletes on `local`, and on `public` if the old copy is there
   - `response(string $path)` → reads `local` first, **falls back to `public`** (old files), 404 otherwise
2. Replace every `store('identity-cards', 'public')` and the matching deletes with this class (inventory §3).
3. New controller `IdentityDocumentController`:
   - `GET /identity-documents/profiles/{user}` → authorize (D1) → stream the image
   - `GET /identity-documents/staff/{user}/{side}` (`front|back`) → authorize (D2)
   - Headers: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`; correct MIME (PDF is allowed in step 4).
   - Rate limit (`throttle:60,1`).
4. Server sends a URL (e.g. `identityCardUrl` / `identity_card_url`) instead of the raw path; frontend `<img>` / "open" links use it instead of `/storage/${path}`.
5. `ClearStorageCommand`: delete the directory on both disks.
6. Tests:
   - upload stores on `local`, nothing new under `public/identity-cards`
   - owner / assigned matchmaker / agency manager / admin → 200; other matchmaker, other agency, member → 403; guest → login redirect
   - old file only on `public` still served through the route (fallback)
   - replacing a document deletes the old one on either disk

After Phase 2 is deployed, new uploads are private and old ones still display (fallback).

### Phase 3 — Move existing files
Artisan command `identity-documents:move-to-private`:
- `--dry-run` (default): lists files referenced in `profiles.identity_card_front_path`, `users.identity_card_front_path`, `users.identity_card_back_path`, and orphan files in `public/identity-cards`; counts what would move.
- real run: **copy** each file to `local` (same relative path), verify size + `sha256` match, log result; idempotent (skips files already copied).
- `--delete-public`: separate, later run (after D4 window) that deletes public copies **only** when the private copy exists and matches.
- Never touches the database.
- Tests with `Storage::fake('public')` / `Storage::fake('local')`.

### Phase 4 — Clean-up (after the rollback window)
- Run `--delete-public`.
- Remove the `public` fallback from `IdentityDocumentStorage::response()` in a later release.

## 6. Deployment (cPanel) — step by step
1. **Backup first**: download `storage/app/public/identity-cards/` (zip from cPanel File Manager) and a DB dump.
2. Check that `storage/app/private` exists, is writable, and is **not** inside the web root (the web root must be `public/` / `public_html` pointing to `public/`). Open `https://<site>/storage/app/private/...` style URLs to confirm they 404.
3. Deploy Phase 1 → manual checks (§8).
4. Deploy Phase 2 (`npm run build`, `route:cache`, `config:cache`) → upload a test document, confirm it is under `storage/app/private/identity-cards` and visible only to allowed viewers.
5. Run `php artisan identity-documents:move-to-private --dry-run`, review counts, then without `--dry-run`. Keep the output log.
6. Wait the rollback window (D4), then `--delete-public`.

## 7. Rollback
- Phases 1–2: revert code; files are untouched (new private uploads would need copying back to `public` — the command can do the reverse if needed: add `--to-public` option).
- Phase 3 before `--delete-public`: revert code; public copies still exist → nothing lost.
- After `--delete-public`: rollback requires copying files back → that is why it waits.

## 8. Manual verification
- Member step 4: upload, replace, view own CIN.
- Staff edit prospect profile: view/replace CIN.
- Validation modal (agency prospects, prospects, dispatch, validated prospects): existing CIN shows; new upload works.
- Create staff with front/back ID cards (admin).
- Another matchmaker / member: opening the identity URL → 403.
- Logged out: identity URL → login page.
- Network tab on news feed, `/profile/{username}`, prospect lists: no `cin`, `cin_hash`, `identity_card_*`, `cin_decrypted`.
- Old (pre-move) documents still display during the window.

## 9. Effort / order
Phase 1 ≈ 0.5–1 day (highest value, can ship alone). Phase 2 ≈ 1–1.5 days. Phase 3 ≈ 0.5 day. Phase 4 later.
