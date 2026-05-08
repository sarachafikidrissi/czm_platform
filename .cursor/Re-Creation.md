# Feature — RDV Re-Creation After Échec (with Motif de Récréation)

## Context

When an RDV has status `echec`, re-creating an RDV between the same two profiles is currently blocked entirely. This feature lifts that restriction under specific conditions, and introduces a mandatory `motif_de_recreation` field to justify the re-creation.

---

## Conditions for Re-Creation to Be Allowed

Re-creation is permitted **only when all three conditions are true simultaneously:**

1. A past RDV between the same two profiles exists with status `echec`
2. Neither profile currently has an active proposition (`pending` or `interested`)
3. Neither profile currently has an RDV with status `en_cours`

---

## To-Do List

### Database

- [ ] Add a `motif_de_recreation` column (text, nullable) to the `rdvs` table
- [ ] Add an `is_recreation` column (boolean, nullable, default `false`) to the `rdvs` table
- [ ] Write and run the migration

---

### Backend

- [ ] In the RDV creation endpoint, detect whether a past `echec` RDV exists between the same two profiles
- [ ] If a past `echec` RDV is found, switch to the **re-creation validation path**:
  - [ ] Check that neither profile has an active proposition — block with 422 if one exists
  - [ ] Check that neither profile has an `en_cours` RDV — block with 422 if one exists
  - [ ] Validate that `motif_de_recreation` is present and non-empty — block with 422 if missing
  - [ ] Set `is_recreation = true` on the new RDV row
  - [ ] Persist `motif_de_recreation` on the new RDV row
- [ ] If no past `echec` RDV is found, keep the existing standard creation validation unchanged
- [ ] Update the `can_create_rdv` flag logic to return `true` in the re-creation scenario when all three conditions above are met
- [ ] Add a companion flag `is_recreation_context` (boolean) to the RDV/proposition API response — return `true` when the re-creation path applies, `false` otherwise
- [ ] Add the appropriate error responses with clear messages for each blocking case (see Toast section below)

---

### Frontend

#### Button Logic — Proposition List & Profile Page

- [ ] When `can_create_rdv = true` and `is_recreation_context = false` → show the existing **"Créer un RDV"** button (no change)
- [ ] When `can_create_rdv = true` and `is_recreation_context = true` → replace the button with **"Re-créer un RDV"** (same style, distinct label)
- [ ] Apply this button-swap logic consistently in both:
  - [ ] The proposition list actions column
  - [ ] The participant profile page

#### RDV Creation Modal

- [ ] Pass an `isRecreationContext` prop into the existing `CreateRdvModal`
- [ ] When `isRecreationContext = true`, render an additional **required** textarea field:
  - Label: `Motif de re-création`
  - Placeholder: `Expliquez la raison de la re-création de ce RDV…`
  - Inline validation: block submission and show an error if the field is empty
- [ ] When `isRecreationContext = false`, do not render the extra field — modal remains unchanged
- [ ] Include `motif_de_recreation` in the request payload on submit, only when in re-creation context

#### Post-Submission State

- [ ] After a successful re-creation, replace the "Re-créer un RDV" button with a **"RDV re-créé"** badge
- [ ] Update state in place — no full page reload
- [ ] Show the appropriate success toast

---

### Toast Notifications

- [ ] RDV re-created successfully → ✅ `"RDV re-créé avec succès. Les deux profils ont été notifiés."`
- [ ] Blocked — active proposition exists → ⚠️ `"Re-création impossible — un profil a une proposition en cours."`
- [ ] Blocked — RDV en cours exists → ⚠️ `"Re-création impossible — un RDV est déjà en cours pour un de ces profils."`
- [ ] Blocked — no past échec RDV found → ❌ `"Aucun RDV échoué trouvé entre ces deux profils."`
- [ ] Blocked — motif missing → ❌ `"Le motif de re-création est obligatoire."`

---

## Architectural Rules to Respect

- Reuse the existing `CreateRdvModal` — do not create a new modal
- All UI decisions must rely on `can_create_rdv` and `is_recreation_context` flags returned by the backend — no hardcoded status or role checks in the frontend
- The `is_recreation` column enables future reporting on re-created RDVs — do not remove it even if unused for now
- Leave a `// TODO: display motif in RDV detail view` comment where the motif would eventually be surfaced in the matchmaker RDV detail/list view
- All other existing `echec` blocks on unrelated flows remain unchanged — only the direct re-creation path is unlocked by this feature