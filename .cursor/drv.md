## Task: Implement "Créer un RDV" Feature — Full Flow (Matchmaker → Profiles → Feedback)

### Context
When a matchmaker creates a proposition between two profiles (e.g. Jack and Jasmine) and
both have accepted (status = `interested`), a new "Créer un RDV" button must appear on the
proposition. This triggers a full RDV (rendez-vous) lifecycle: creation, phone sharing,
feedback from both users and matchmaker, and status tracking across dedicated pages.

---

## GROUND RULES — DO NOT BREAK EXISTING CODE
- Do NOT modify any existing proposition, matchmaking, or profile logic
- All new features are additive — new tables, new controllers, new components only
- Reuse existing auth middleware, role checks, toast system, and UI component library
- Reuse existing modal patterns from `propositions-list.jsx` for new modals
- All new sidebar links are appended — do not restructure the existing sidebar

---


### 4. `RdvController` — routes and methods

#### create RDV
- Auth: matchmaker only
- Validate:
  - `proposition_id` exists and status is `interested` on BOTH sides of the pair
  - Current user is the matchmaker who created the original proposition
    (`proposition->matchmaker_id === $me->id`)
  - No existing RDV already exists for this proposition pair (prevent duplicates)
- Create `Rdv` row with provided fields
- If `share_phone === true`: both profiles can now see each other's phone number
  via the RDV record (do not store on user — derive from RDV at read time)
- Update both profiles' RDV status to `en_cours` (store on `rdvs.status`, not on user)
- Return created RDV with 201

#### list RDVs for authenticated user (member view)
- Auth: any authenticated user
- Returns all RDVs where `reference_user_id = $me->id` OR `compatible_user_id = $me->id`
- Include: `matchmaker:id,name`, `referenceUser:id,name`, `compatibleUser:id,name`,
  `feedbacks` (only the current user's own feedback), `proposition:id`
- If `share_phone === true`, include the other profile's phone number in the response
- Paginate: 10 per page

#### list all RDVs created by matchmaker
- Auth: matchmaker only
- Returns all RDVs where `matchmaker_id = $me->id`
- Include full profile data, status, feedbacks (all), proposition
- Filter by status via query param: `?status=en_cours|reussi|echec`
- Paginate: 10 per page

####  single RDV detail
- Auth: must be matchmaker owner OR one of the two profiles
- Returns full RDV with all feedbacks

#### submit feedback
- Auth: authenticated user who is either:
  - One of the two profiles (user feedback)
  - The matchmaker who created the RDV (matchmaker feedback)
- Validate:
  - One feedback per author per RDV (prevent duplicates)
  - Required fields differ by `author_role`:
    - User: `avis` (required), `feedback_message` (optional)
    - Matchmaker: `espace_de_rdv` (required), `signe_de_rdv` (required),
      `avis_matchmaker` (optional), `evaluation_de_rdv` (optional),
      `feedback_message` (optional), `espace_autre_detail` (required if espace = 'autre')
- Create `RdvFeedback` row
- allow matchmaker to update/delete feedback
- Return 201

#### update RDV status
- Auth: matchmaker owner only
- Allowed values: `reussi`, `echec`
- Update `rdvs.status`
- Return updated RDV

### 5. `RdvPolicy`
```php
create:         $user->hasRole('matchmaker') && proposition->matchmaker_id === $user->id
view:           matchmaker owner OR reference/compatible user
addFeedback:    matchmaker owner OR reference/compatible user (not already submitted)
updateStatus:   matchmaker owner only
```



### 7. Serializer / API response flags
- Add to proposition payload (in both `PropositionController` and `UserController`
  enriched matchmaking results):
```php
  'can_create_rdv' => (
      $bothSidesAccepted &&
      $proposition->matchmaker_id === $me->id &&
      ! $rdvAlreadyExists
  )
```
- Add to RDV payload:
```php
  'can_add_feedback'      => $userIsParticipant && ! $alreadySubmittedFeedback,
  'other_profile_phone'   => $rdv->share_phone ? $otherUser->phone : null,
  'my_feedback'           => $myFeedback ?? null,
```

---

## Part 3 — Frontend

### 8. "Créer un RDV" button
**Locations**: `propositions-list.jsx` AND the profile page matchmaking results card
  (`MatchCard` component from previous task)

- Show the button only when `can_create_rdv === true`
- Button label: `"Créer un RDV"`
- On click: open `<CreateRdvModal>`

### 9. `CreateRdvModal` component
**File**: `resources/js/components/rdv/CreateRdvModal.jsx`

Form fields:
- `regle` — textarea, pre-filled with default rule text:
  `"Les deux profils s'engagent à respecter les règles de bienséance et de respect mutuel lors de ce rendez-vous."`
  (editable by matchmaker)
- `message` — textarea, label: `"Message aux profils"`
- `share_phone` — radio buttons:
  - `"Non"` (default)
  - `"Oui — autoriser l'échange de numéros de téléphone"`
- Submit button: `"Envoyer le RDV"`

On submit:
- Call `POST /api/rdv`
- On success:
  - Close modal
  - Toast ✅ `"RDV créé avec succès. Les deux profils ont été notifiés."`
  - Update local proposition card state: hide "Créer un RDV" button
- On error:
  - Toast ❌ `"Erreur lors de la création du RDV. Veuillez réessayer."`

### 10. User-facing "Mes RDVs" page

Table columns:
| Column | Details |
|---|---|
| Date | `created_at` formatted |
| Avec qui | Other profile's name |
| Matchmaker | Matchmaker name |
| Statut | Badge: `En cours` / `Réussi` / `Échec` |
| Téléphone | Other profile's phone (only if `share_phone === true`, else `—`) |
| Numéro de feedback | Count of feedbacks submitted for this RDV |
| Actions | `"Ajouter un feedback"` button (disabled if already submitted) |

- Clicking `"Ajouter un feedback"` redirects to `/mes-rdvs/{id}/feedback`
- Below each row (expandable or separate section): list of all feedbacks for that RDV
  (only the current user's own feedback is shown)

### 11. User feedback page

Form fields:
- `avis` — radio: `"J'ai bien aimé"` / `"Je n'ai pas aimé"`
- `feedback_message` — textarea, label: `"Votre commentaire (optionnel)"`
- Submit button: `"Envoyer mon feedback"`

On submit:
- Call `POST /rdv/{id}/feedback` with `author_role: 'user'`
- On success:
  - Toast ✅ `"Feedback envoyé avec succès."`
  - Redirect to `/mes-rdvs`
- On error:
  - Toast ❌ `"Erreur lors de l'envoi du feedback."`

### 12. Profile page — "En RDV" status badge + matchmaker feedback button
- In the member's profile page (visible to matchmaker viewing the profile):
  - If the profile has an active RDV (`status = en_cours`), show badge: `"En RDV"`
    next to the profile name/header
  - Show button `"Ajouter un feedback"` visible only to the matchmaker who created the RDV
  - On click: open `<MatchmakerFeedbackModal>`

### 13. `MatchmakerFeedbackModal` component
**File**: `resources/js/components/rdv/MatchmakerFeedbackModal.jsx`

Form fields:
- `feedback_message` — textarea, label: `"Commentaire général"`
- `espace_de_rdv` — radio:
  - `"Agence"`
  - `"Espace public"`
  - `"Autre"` → reveals text input `"Précisez l'espace"`
- `signe_de_rdv` — radio: `"Positif"` / `"Négatif"`
- `avis_matchmaker` — textarea, label: `"Avis du matchmaker"`
- `evaluation_de_rdv` — textarea, label: `"Évaluation du RDV"`
- Submit button: `"Envoyer le feedback"`

On submit:
- Call `POST /rdv/{id}/feedback` with `author_role: 'matchmaker'`
- On success:
  - Close modal
  - Toast ✅ `"Feedback matchmaker enregistré."`
- On error:
  - Toast ❌ `"Erreur lors de l'envoi du feedback."`

### 14. Matchmaker sidebar — RDV section
- Append to existing sidebar (do not restructure):

RDV
├── RDV en cours     → /staff/rdv?status=en_cours
├── RDV réussis      → /staff/rdv?status=reussi
└── RDV échecs       → /staff/rdv?status=echec

### 15. Matchmaker RDV list page

Table columns:
| Column | Details |
|---|---|
| Profils | Reference name + Compatible name |
| Statut | Badge with color per status |
| Feedback | Count of feedbacks for this RDV |
| Actions | `"Ajouter un feedback"` → opens `<MatchmakerFeedbackModal>` |

- Tabs or filter buttons at top: `En cours` / `Réussis` / `Échecs`
- Switching tab updates `?status=` query param and re-fetches

---

## Part 4 — Toast Notifications Summary

| Action | Toast |
|---|---|
| RDV created | ✅ `"RDV créé avec succès."` |
| RDV creation blocked (already exists) | ❌ `"Un RDV existe déjà pour cette proposition."` |
| RDV creation blocked (not both accepted) | ❌ `"Les deux profils doivent avoir accepté la proposition."` |
| User feedback submitted | ✅ `"Feedback envoyé avec succès."` |
| Matchmaker feedback submitted | ✅ `"Feedback matchmaker enregistré."` |
| Feedback already submitted | ⚠️ `"Vous avez déjà soumis un feedback pour ce RDV."` |
| Any generic error | ❌ `"Une erreur est survenue. Veuillez réessayer."` |

---

## Acceptance Criteria
- [ ] "Créer un RDV" button visible only when both sides accepted AND current user
      is the creating matchmaker AND no RDV exists yet for this proposition
- [ ] RDV created with correct fields, `share_phone` toggles phone visibility
- [ ] `can_create_rdv` flag returned correctly by both proposition and profile endpoints
- [ ] User "Mes RDVs" page lists all RDVs with correct columns and phone conditional
- [ ] User feedback page submits correctly, redirects after success
- [ ] Duplicate feedback blocked (422) — button disabled after submission
- [ ] "En RDV" badge appears on profile when RDV status is `en_cours`
- [ ] Matchmaker feedback modal submits correctly from profile page and RDV list page
- [ ] Matchmaker sidebar shows RDV section with 3 filtered sub-pages
- [ ] Matchmaker RDV list filters by status correctly via query param
- [ ] `MatchCard` component (profile page matchmaking results) also shows
      "Créer un RDV" button when `can_create_rdv === true`
- [ ] All toasts fire correctly for every action and error state
- [ ] No existing proposition, matchmaking, profile, or sidebar functionality is broken
- [ ] Add tests:
  - `POST /rdv` succeeds when both sides accepted and user is creating matchmaker
  - `POST /rdv` blocked when only one side accepted (422)
  - `POST /rdv` blocked when RDV already exists (422)
  - `POST /rdv` blocked when user is not the creating matchmaker (403)
  - `POST /rdv/{id}/feedback` succeeds for user participant
  - `POST /rdv/{id}/feedback` succeeds for matchmaker owner
  - `POST /rdv/{id}/feedback` blocked on duplicate submission (422)
  - `GET /rdv/my` returns only RDVs where user is a participant
  - `GET /rdv/matchmaker` returns only RDVs created by authenticated matchmaker
  - Phone number only visible in response when `share_phone === true`
  - `can_create_rdv` is `false` when RDV already exists for proposition