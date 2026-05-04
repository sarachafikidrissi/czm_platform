## Task: RDV & Feedback Fixes + Enhancements (User & Matchmaker)

### Context
The base RDV feature has been implemented. This prompt fixes incorrect behaviors and adds
missing features for both users and matchmakers. Do NOT touch any existing proposition,
matchmaking, or profile logic outside of what is explicitly listed below.

---

## GROUND RULES
- All changes are additive or corrective — do not refactor existing working features
- Reuse existing toast system, modal patterns, auth middleware, and UI components
- Every data change must be reflected immediately in the UI (optimistic update or re-fetch)
- All new columns or fields are additive — no destructive migrations

---

## Part 1 — User-Side Fixes & Additions

### 1. Profile page 
— show proposition status and RDV status


**Frontend (profile page — member view of own profile):**
- Below the profile header, add a status strip visible only to the profile owner:
  - If active proposition exists:
    - `pending`     → badge `"Proposition en attente"`
    - `interested`  → badge `"Proposition acceptée"`
  - If active RDV exists:
    - `en_cours`    → badge `"En RDV — En cours"`
  - If both exist, show only RDV
  - If neither, show nothing

---

### 2. Feedback count — user sees only their own feedback count

**Backend (`GET /api/rdv/my`):**
- Change `feedback_count` (or `numero_de_feedback`) to count only rows in
  `rdv_feedbacks` where `rdv_id = rdv.id` AND `author_id = $me->id`
```php
  'my_feedback_count' => $rdv->feedbacks->where('author_id', $me->id)->count(),
```
- Remove or rename the old total count field to avoid confusion

**Frontend (Mes RDVs table):**
- Column `"Numéro de feedback"` must display `my_feedback_count`, not total count
- Tooltip on hover: `"Nombre de feedbacks que vous avez soumis"`

---

### 3. Feedback page — display existing feedbacks + allow multiple feedbacks per RDV
- Remove the one-feedback-per-user block :
  - Users ARE allowed to submit multiple feedbacks for the same RDV
  - Only matchmaker feedback remains one-per-RDV (see Part 2)

**Frontend (`/mes-rdvs/{id}/feedback`):**
- At the top of the page, show a list of all feedbacks previously submitted by
  the user for this RDV:
  - Each entry shows: date, `avis` badge, `feedback_message`
  - If no feedbacks yet: show `"Vous n'avez pas encore soumis de feedback pour ce RDV."`
- Below the list, always show the feedback form so the user can add another
- "Ajouter un feedback" button in the Mes RDVs table always navigates to this page
  (remove the `disabled` state — it is no longer blocked after first submission)

---

### 4. RDV status derived from user feedback (avis)

**Backend:**
- When a user submits feedback, do NOT auto-update `rdvs.status` globally
- Instead, add a per-user derived status field  response:
```php
 'pas_aime' ? 'rejete' : 'accepte'
      : null,
```
  (based on their latest feedback's `avis` value)

**Frontend (Mes RDVs table):**
- `"Statut"` column for users:
  - If `user_rdv_status === 'rejete'`  → badge `"Rejeté"` (red)
  - If `user_rdv_status === 'accepte'` → badge `"Accepté"` (green)
  - If `user_rdv_status === null`      → badge `"En attente de feedback"` (grey)
- Note: This is separate from the global `rdvs.status` (which is matchmaker-controlled)

---

### 5. RDV actions added to user activity history

**Backend:**
- Whenever any of the following occur for a user, append an entry to their activity
  history (use existing activity log system — if none exists, create an
  `activity_logs` table with: `user_id`, `type`, `description`, `metadata` JSON,
  `created_at`):

  | Event | `type` | `description` |
  |---|---|---|
  | RDV created (as participant) | `rdv_created` | `"Un RDV a été créé par votre matchmaker avec {other_profile_name}"` |
  | User submits feedback | `rdv_feedback_submitted` | `"Vous avez soumis un feedback pour votre RDV avec {other_profile_name}"` |
  | RDV status updated to `reussi` | `rdv_reussi` | `"Votre RDV avec {other_profile_name} a été marqué comme réussi"` |
  | RDV status updated to `echec` | `rdv_echec` | `"Votre RDV avec {other_profile_name} a été marqué comme échoué"` |

- Log activity for BOTH `reference_user` and `compatible_user` on each event
- Store `rdv_id` and other relevant ids in `metadata`

**Frontend (user activity history page — if it exists):**
- Ensure RDV activity types are rendered with appropriate icons and labels
- If no activity history page exists yet, skip frontend for this item and note it

---

## Part 2 — Matchmaker-Side Fixes & Additions

### 6. Matchmaker feedback count — only their own feedbacks



**Frontend (matchmaker RDV list table):**
- Column `"Feedback"` shows `my_feedback_count`
- Tooltip: `"Nombre de feedbacks que vous avez soumis"`

---

### 7. Allow matchmaker to update their own feedback

**Backend:**
- Auth: matchmaker must be the author of the feedback (`author_id === $me->id`)
- Allowed fields to update: all matchmaker feedback fields
  (`feedback_message`, `espace_de_rdv`, `espace_autre_detail`, `signe_de_rdv`,
  `avis_matchmaker`, `evaluation_de_rdv`)
- Return updated feedback with 200
- Add to `RdvPolicy`: `updateFeedback` — only feedback author

**Frontend:**
- In `MatchmakerFeedbackModal`, if the matchmaker already has a feedback for this RDV:
  - Pre-fill all form fields with existing values
  - Change submit button label to `"Mettre à jour le feedback"`
  - Call `PATCH ` instead of `POST`
- Toast ✅ `"Feedback mis à jour avec succès."`
- Toast ❌ `"Erreur lors de la mise à jour du feedback."`

---

### 8. Matchmaker sees all feedbacks — user feedbacks + their own

**Backend :**
- When authenticated user is the matchmaker owner, return ALL feedbacks:
```php
  'all_feedbacks' => $rdv->feedbacks->map(fn($f) => [
      'id'              => $f->id,
      'author_id'       => $f->author_id,
      'author_name'     => $f->author->name,
      'author_role'     => $f->author_role,
      'avis'            => $f->avis,
      'feedback_message'=> $f->feedback_message,
      'espace_de_rdv'   => $f->espace_de_rdv,
      'signe_de_rdv'    => $f->signe_de_rdv,
      'avis_matchmaker' => $f->avis_matchmaker,
      'evaluation_de_rdv' => $f->evaluation_de_rdv,
      'created_at'      => $f->created_at,
      'updated_at'      => $f->updated_at,
  ]),
  'my_feedback'    => $rdv->feedbacks->firstWhere('author_id', $me->id),
```

**Frontend — matchmaker RDV list page (`rdv-list.jsx`):**
- Add an expandable row or side panel per RDV showing:

  **Section A — Feedbacks des profils (user feedbacks):**
  - Table: `Profil | Avis | Commentaire | Date`
  - If no user feedback yet: `"Aucun feedback reçu des profils."`

  **Section B — Mon feedback (matchmaker's own feedback):**
  - If submitted: display all fields with an `"Modifier"` button → opens
    `MatchmakerFeedbackModal` pre-filled
  - If not submitted: show `"Ajouter un feedback"` button → opens modal in create mode

**Frontend — profile page (matchmaker viewing a participant's profile):**
- Add a `"Voir les feedbacks"` button visible only to the RDV's matchmaker
- On click: opens a read-only modal listing:
  - That profile's submitted feedbacks (filtered by `author_id = profileUser.id`)
  - Matchmaker's own feedback for this RDV

---

### 9. RDV statistics on matchmaker production page

**Backend — new endpoint or extend existing production stats:**
- `GET /api/matchmaker/stats` (extend if exists, create if not)
- Add RDV stats block:
```php
  'rdv_stats' => [
      'total'     => $rdvs->count(),
      'en_cours'  => $rdvs->where('status', 'en_cours')->count(),
      'reussis'   => $rdvs->where('status', 'reussi')->count(),
      'echecs'    => $rdvs->where('status', 'echec')->count(),
      'taux_reussite' => $rdvs->count()
          ? round($rdvs->where('status', 'reussi')->count() / $rdvs->count() * 100, 1)
          : 0,
      'feedbacks_soumis' => RdvFeedback::where('author_id', $me->id)->count(),
  ]
```

**Frontend — matchmaker production/stats page:**
- Add a `"RDV"` statistics card/section:
  - `Total RDV créés`
  - `En cours` / `Réussis` / `Échecs` with colored badges
  - `Taux de réussite: XX%`
  - `Feedbacks soumis par moi`

---

### 10. Block new RDV creation when a "réussi" RDV already exists for the proposition

**Backend (`POST /api/rdv`):**
- Add check before creating:
```php
  $successfulRdvExists = Rdv::where('matchmaker_id', $me->id)
      ->where(function($q) use ($referenceId, $compatibleId) {
          $q->where('reference_user_id', $referenceId)
            ->where('compatible_user_id', $compatibleId);
      })
      ->where('status', 'reussi')
      ->exists();

  if ($successfulRdvExists) {
      abort(422, 'Un RDV réussi existe déjà pour ces deux profils.');
  }
```
- Update `can_create_rdv` flag:
```php
  'can_create_rdv' => (
      $bothSidesAccepted &&
      $proposition->matchmaker_id === $me->id &&
      ! $anyRdvExists &&
      ! $successfulRdvExists
  )
```

**Frontend:**
- If `can_create_rdv === false` AND a réussi RDV exists:
  - Replace "Créer un RDV" button with a disabled badge: `"RDV Réussi ✓"`
- Toast on blocked attempt: ⚠️ `"Un RDV réussi existe déjà pour ces profils."`

---

### 11. Block proposition cancellation once an RDV exists

**Backend (`PropositionController@cancel`):**
- Before cancelling, check if an RDV exists for this proposition:
```php
  $rdvExists = Rdv::where('proposition_id', $proposition->id)
      ->orWhere(function($q) use ($proposition) {
          $q->where('reference_user_id', $proposition->reference_user_id)
            ->where('compatible_user_id', $proposition->compatible_user_id);
      })
      ->exists();

  if ($rdvExists) {
      abort(422, 'Impossible d\'annuler une proposition pour laquelle un RDV a été créé.');
  }
```
- Also block the paired-row cascade cancel if the paired proposition has an RDV

**Frontend:**
- Update `can_cancel` flag in proposition payload:
```php
  'can_cancel' => (
      $isAssignedMatchmaker &&
      in_array($proposition->status, ['pending', 'interested']) &&
      ! $rdvExistsForThisProposition
  )
```
- If `can_cancel === false` due to RDV existing:
  - Hide or disable the "Annuler" button
  - Show tooltip: `"Annulation impossible — un RDV a été créé pour cette proposition"`
- Toast on blocked attempt: ⚠️ `"Cette proposition ne peut pas être annulée car un RDV a été créé."`

---

## Part 3 — Toast Notifications Summary (additions only)

| Action | Toast |
|---|---|
| Feedback updated by matchmaker | ✅ `"Feedback mis à jour avec succès."` |
| RDV creation blocked (réussi exists) | ⚠️ `"Un RDV réussi existe déjà pour ces profils."` |
| Proposition cancel blocked (RDV exists) | ⚠️ `"Annulation impossible — un RDV a été créé."` |
| User submits additional feedback | ✅ `"Feedback envoyé avec succès."` |
| Matchmaker views user feedbacks | (no toast — read-only action) |

---

## Acceptance Criteria

### User
- [ ] Own profile shows proposition status badge and RDV status badge when applicable
- [ ] Feedback count in Mes RDVs shows only user's own feedback count
- [ ] Feedback page lists all previously submitted feedbacks by the user
- [ ] Feedback page always shows the form to add another feedback
- [ ] User RDV status derived from latest `avis`: `rejete` / `accepte` / null
- [ ] RDV events (created, feedback, status change) appear in activity history

### Matchmaker
- [ ] Feedback count in RDV list shows only matchmaker's own feedback count
- [ ] Matchmaker can update their existing feedback — modal pre-fills correctly
- [ ] Matchmaker sees user feedbacks in RDV detail (expandable row or panel)
- [ ] Matchmaker sees own feedback with edit option in same panel
- [ ] Production stats page shows RDV statistics block with all fields
- [ ] "Créer un RDV" blocked and replaced with badge when réussi RDV exists
- [ ] Proposition cancel blocked when any RDV exists for that proposition
- [ ] `can_cancel` flag is `false` when RDV exists — button hidden/disabled in UI
- [ ] "Voir les feedbacks" button on profile page shows correct filtered feedbacks

