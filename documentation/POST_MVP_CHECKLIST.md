# InvAIsive Trace — Post-MVP Planning Checklist

This checklist records the agreed post-MVP direction and implementation progress for the hackathon demo. The product decisions in Stage 1 are locked; remaining items are validation tasks.

See [POST_MVP_FEATURE_PLAN.md](POST_MVP_FEATURE_PLAN.md) for feature descriptions and open questions.

## Stage 1: Confirm scope and decisions — complete

- [x] Hackathon demo only; no public release or hosted public service.
- [x] One primary photo plus up to three supporting photos; maximum 5 MB per photo.
- [x] Gemini analyzes the primary photo; supporting photos add context for reviewers.
- [x] All report photos are public with visible reports; strip metadata before upload.
- [x] Reporter identity stays private in public views; member accounts support contribution metrics.
- [x] New reports are immediately public as `unverified`.
- [x] Regular member accounts with one backend-configured moderator role; reports are privately attributed to their submitting account.
- [x] Public activity shows reviewer role and public reason, not personal identity; no private notes.
- [x] Statuses: `unverified`, `needs_review`, `verified`, `rejected`; rejected reports are hidden from public map/list.
- [x] Moderator retains reports and review history until deletion.
- [x] Impact events: `inspection`, `treatment`, `follow-up`; reviewers only, each requires date and note, photos optional.
- [x] Count verified reports, inspections, treatments, and follow-up outcomes separately.
- [x] Exact public coordinates require reporter opt-in; otherwise show an approximate pin.

## Stage 2: Design trust and review workflow

- [x] Map allowed status transitions among unverified, needs_review, verified, and rejected.
- [x] Implement the moderator review queue; duplicate detection remains a later enhancement.
- [x] Show timestamped public activity with actor role and reason, excluding personal reviewer identity and private notes.
- [x] Restrict deletion to moderators; deletion removes the report and its linked history.
- [x] Keep reviewer credentials on the backend; the mobile app receives only its temporary API session token.

## Stage 3: Design multiple-photo reporting

- [x] Add up to three supporting images from camera/library, with thumbnails and removal.
- [x] Identify the primary/Gemini image; Gemini analyzes only the primary.
- [x] Handle the 5 MB per-photo cap, image processing, and upload failures.
- [x] Store supporting photos as ordered linked records while keeping legacy primary photos readable.
- [x] Strip metadata from uploaded photos and show the complete gallery for visible reports.

## Stage 4: Design report details and activity

- [x] Open report details in a modal from the scrollable Sightings list.
- [x] Show photo gallery, species/catalog source, location precision, notes, and current status.
- [x] Show chronological public review activity with reviewer role and public reason.
- [x] Hide rejected reports from the public map and list.
- [ ] Refine and validate loading, empty, offline, deleted-photo, and permission-denied states.

## Stage 5: Define impact tracking

- [x] Record inspection, treatment, and follow-up as separate moderator-created events.
- [x] Require an event date and note; support optional event photos.
- [x] Capture follow-up outcomes as recorded notes (for example, recurrence or no regrowth), not as proof of eradication.
- [x] Display separate counts for verified sightings, inspections, treatments, and follow-ups.
- [x] Explain that a verified sighting is not a treatment or ecological outcome.

## Stage 6: Validate the implemented demo

- [ ] Walk through the workflows with demo participants and reviewers, if available.
- [x] Keep organization participation or endorsement claims out unless a partnership is established.
- [x] Prioritize report details, multi-photo reporting, moderator review, and impact tracking for the demo.
- [x] Record the acceptance scenarios in the feature plan for device validation.

## Implementation status

- [x] Implement multi-photo reporting while keeping existing single-photo reports readable.
- [x] Implement modal report details and public activity history.
- [x] Implement account sign-up/sign-in, moderator-only community metrics, and status workflow, including rejected-report visibility rules.
- [x] Implement reviewer-created impact events and separate impact counts.
- [ ] Run through the demo acceptance scenarios with PocketBase running.
- [ ] Validate the flows on the judge-facing device(s).

TypeScript, backend syntax, and whitespace checks pass. PocketBase integration and on-device behavior still need validation.
