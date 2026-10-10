# Spot the Spread — Post-MVP Planning Checklist

This checklist records the agreed post-MVP direction and implementation progress for the hackathon demo. The product decisions in Stage 1 are locked; remaining items are validation tasks.

See [POST_MVP_FEATURE_PLAN.md](POST_MVP_FEATURE_PLAN.md) for feature descriptions and open questions.

## Stage 1: Confirm scope and decisions — complete

- [x] Hackathon demo only; no public release or hosted public service.
- [x] One primary photo plus up to three supporting photos; maximum 5 MB per photo.
- [x] Gemini analyzes the primary photo; supporting photos add context for reviewers.
- [x] All report photos are public with visible reports; strip metadata before upload.
- [x] Anonymous reporters; no reporter account system for the demo.
- [x] New reports are immediately public as `unverified`.
- [x] Invite-only reviewers; a moderator grants reviewer roles.
- [x] Public activity shows reviewer role and public reason, not personal identity; no private notes.
- [x] Statuses: `unverified`, `needs_review`, `verified`, `rejected`; rejected reports are hidden from public map/list.
- [x] Moderator retains reports and review history until deletion.
- [x] Impact events: `inspection`, `treatment`, `follow-up`; reviewers only, each requires date and note, photos optional.
- [x] Count verified reports, inspections, treatments, and follow-up outcomes separately.
- [x] Exact public coordinates require reporter opt-in; otherwise show an approximate pin.

## Stage 2: Design trust and review workflow

- [ ] Map allowed transitions among unverified, needs_review, verified, and rejected.
- [ ] Design reviewer queue and duplicate-report handling.
- [ ] Design timestamped public review activity with actor role, action, and public reason; exclude reviewer identity and private notes.
- [ ] Define who may delete a report and how deletion affects its public history.
- [ ] Review reviewer access design so privileged credentials are not embedded in the mobile app.

## Stage 3: Design multiple-photo reporting

- [ ] Design add-from-camera/library flow for up to three supporting images, including thumbnails and removal.
- [ ] Make the primary/Gemini image clear; Gemini analyzes the primary image.
- [ ] Design handling for the 5 MB per-photo cap, image processing, and upload failures.
- [ ] Design ordered one-to-many photo storage and migration from the MVP single-photo field.
- [ ] Strip metadata from every photo and show all report photos publicly with visible reports.

## Stage 4: Design report details and activity

- [ ] Design the report card's inline expanded view in the scrollable list.
- [ ] Include photo gallery, species/catalog provenance, location precision, notes, and current status.
- [ ] Show chronological public review activity with reviewer role and public reason.
- [ ] Hide rejected reports from the public map and list.
- [ ] Define loading, empty, offline, deleted-photo, and permission-denied states.

## Stage 5: Define impact tracking

- [ ] Design inspection, treatment, and follow-up as distinct reviewer-created events.
- [ ] Require a date and note for each event; allow optional event photos.
- [ ] Define follow-up outcome labels, including recurrence/no-regrowth, as recorded observations.
- [ ] Display separate counts for verified reports, inspections, treatments, and follow-up outcomes.
- [ ] Ensure verified sightings are not counted as treatment, eradication, or ecological improvement.

## Stage 6: Validate with users before implementation

- [ ] Walk through the workflows with demo participants and reviewers, if available.
- [ ] Keep organization participation or endorsement claims out unless a partnership is established.
- [ ] Rank the agreed features by demo value and feasibility.
- [ ] Turn the acceptance scenarios in the feature plan into a phased implementation checklist.

## Implementation status

- [x] Implement multi-photo reporting while keeping existing single-photo reports readable.
- [x] Implement inline report details and public activity history.
- [x] Implement reviewer sign-in/invitations and status workflow, including rejected-report visibility rules.
- [x] Implement reviewer-created impact events and separate impact counts.
- [ ] Run through the demo acceptance scenarios with PocketBase running.
- [ ] Validate the flows on the judge-facing device(s).

TypeScript, backend syntax, and whitespace checks pass. PocketBase integration and on-device behavior still need validation.
