# Proposition Workflow Updates — TODO List & Prompt

## Context
Updates to the proposition workflow covering two specific cases:
expired propositions and accepted propositions. All changes must be consistent
across backend enforcement, API responses, and UI rendering. Do not duplicate
existing RDV creation logic — reuse what already exists.

---

## Case 1 — Expired Proposition

### Backend
- [ ] In `PropositionController@cancel`, before processing cancellation, check if
      the proposition status is `expired`
- [ ] If status is `expired`, block the cancellation and return a 422 error
- [ ] Add `expired` to the list of statuses that make `can_cancel` resolve to `false`
      in the proposition serializer/payload
- [ ] In the proposition list endpoint, when a proposition is expired, the global
      displayed status must return `expired` — not `pending` or `en attente`
- [ ] Ensure the expiry check runs before any other cancel logic — do not let
      expired propositions pass through any other status gate

### Frontend
- [ ] In the propositions list table, when `can_cancel` is `false` due to expiry,
      hide the cancel button entirely — do not just disable it
- [ ] Status badge in the proposition list must display `"Expirée"` when status
      is `expired` — not `"En attente"` or any other label
- [ ] Do not show any action buttons (cancel, respond, update) on expired proposition rows
- [ ] If the cancel button was previously shown based on a client-side status check,
      update that check to also exclude `expired`

---

## Case 2 — Accepted Proposition (status = `interested`)

### Backend — "Créer un RDV" availability
- [ ] In the proposition serializer/payload, add `can_create_rdv` flag:
  - `true` only when:
    - Both sides of the proposition pair have status `interested`
    - The authenticated user is the matchmaker who created the proposition
    - No existing RDV exists for this proposition pair yet
    - No existing RDV with status `reussi` exists for this pair
  - `false` in all other cases
- [ ] Do NOT create new RDV logic — reuse the existing `POST /api/rdv` endpoint
      and its existing validation entirely
- [ ] Ensure the existing RDV creation endpoint already blocks duplicate RDVs and
      réussi-exists cases — if not, apply those guards there (not here)

### Backend — Block new propositions while one is active or RDV is en cours
- [ ] In `PropositionController@store` and `@sendToOther`, block creating a new
      proposition for a profile pair if:
  - An existing proposition with status `pending` or `interested` exists
    for either profile — this should already be in place, confirm it is enforced
  - OR an existing RDV with status `en_cours` exists for either profile
- [ ] If blocked due to active RDV, return 422:
      "Un RDV est en cours pour ce profil. La proposition sera disponible après
      la clôture du RDV."
- [ ] A new proposition is only unblocked when:
  - The current proposition is `cancelled` or `not_interested`
  - AND no RDV exists with status `en_cours` for either profile
  - OR the RDV has been set to `echec` by the matchmaker
- [ ] Update `can_propose` / `can_send` flags in the proposition and profile
      payloads to reflect this new combined check

### Frontend — Proposition List Table (actions column)
- [ ] When `can_create_rdv` is `true`, display a `"Créer un RDV"` button in the
      actions column of the proposition row — alongside the existing cancel button
- [ ] Clicking `"Créer un RDV"` must open the exact same RDV creation modal
      already used elsewhere — do not build a new one
- [ ] Pass the correct `proposition_id`, `reference_user_id`, and
      `compatible_user_id` from the proposition row to the existing modal
- [ ] When `can_create_rdv` is `false` (RDV already exists), replace the button
      with a read-only badge: `"RDV créé"` — no action
- [ ] Cancel button remains visible alongside `"Créer un RDV"` when both
      `can_cancel` and `can_create_rdv` are true simultaneously
      — unless an RDV already exists, in which case cancel is blocked per
      existing rules (once RDV exists, cancel is disabled)

### Frontend — Profile Page (matchmaker view of participant profile)
- [ ] When the matchmaker assigned to the profile visits the profile of one of
      the proposition participants, display the `"Créer un RDV"` button in the
      profile actions area — visible only to the matchmaker who created
      the proposition
- [ ] Reuse the same modal and the same `can_create_rdv` flag from the
      enriched profile payload
- [ ] If `can_create_rdv` is `false` because an RDV already exists, show
      a badge `"RDV en cours"` or `"RDV créé"` instead of the button
- [ ] This button must not be visible to the profile owner, other matchmakers,
      or any non-matchmaker role

### Frontend — Send Proposition Button Guard
- [ ] When a matchmaker attempts to send a new proposition to a profile that
      already has an `en_cours` RDV, disable the send button and show inline
      message: `"Un RDV est en cours pour ce profil."` 
- [ ] When the RDV is set to `echec`, re-enable the send proposition flow normally
- [ ] The UI guard must rely on the backend `can_propose` flag — do not hardcode
      status checks in the frontend

---

## Toast Notifications

| Action | Type | Message |
|---|---|---|
| Cancel blocked — proposition expired | ⚠️ warning | "Cette proposition est expirée et ne peut pas être annulée." |
| Send blocked — RDV en cours | ⚠️ warning | "Un RDV est en cours pour ce profil. Veuillez attendre sa clôture." |
| RDV created from proposition list | ✅ success | "RDV créé avec succès. Les deux profils ont été notifiés." |
| RDV creation blocked — already exists | ❌ error | "Un RDV existe déjà pour cette proposition." |

---

## Acceptance Criteria

### Expired Proposition
- [ ] Cancel button is fully hidden (not just disabled) on expired proposition rows
- [ ] Status badge shows `"Expirée"` — never `"En attente"` for expired propositions
- [ ] Backend returns 422 if cancel is attempted on an expired proposition
- [ ] `can_cancel` is `false` in the payload for expired propositions
- [ ] No action buttons rendered on expired rows

### Accepted Proposition
- [ ] `"Créer un RDV"` button appears in proposition list actions column when
      `can_create_rdv` is `true`
- [ ] `"Créer un RDV"` button appears on the participant's profile page when
      viewed by the creating matchmaker and `can_create_rdv` is `true`
- [ ] Both buttons open the same existing RDV creation modal — no new modal built
- [ ] After RDV is created, button is replaced by `"RDV créé"` badge in both locations
- [ ] Cancel button is hidden once RDV exists (existing rule — confirm it is enforced)
- [ ] New proposition is blocked for a profile pair while an `en_cours` RDV exists
- [ ] New proposition is unblocked once RDV is set to `echec` by the matchmaker
- [ ] `can_propose` flag is `false` while `en_cours` RDV exists for either profile
- [ ] `"Créer un RDV"` button on profile page is invisible to everyone except the
      matchmaker who created the proposition

### Tests
- [ ] Cancel on expired proposition returns 422
- [ ] Expired proposition payload has `can_cancel: false`
- [ ] Proposition list returns `"expired"` status string for expired rows
- [ ] `can_create_rdv` is `true` only when both sides accepted + no existing RDV
- [ ] `can_create_rdv` is `false` when RDV already exists
- [ ] New proposition creation blocked when `en_cours` RDV exists for either profile
- [ ] New proposition creation succeeds after RDV set to `echec`
- [ ] Profile payload includes `can_create_rdv` flag scoped to the viewing matchmaker
- [ ] Non-creating matchmaker does not receive `can_create_rdv: true` for the same pair
