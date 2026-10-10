# Spot the Spread — Post-MVP Planning Checklist

This checklist records planning work for post-MVP features. It does not authorize implementation. Resolve product and privacy decisions before creating tickets or changing the app.

See [POST_MVP_FEATURE_PLAN.md](POST_MVP_FEATURE_PLAN.md) for feature descriptions and open questions.

## Stage 1: Confirm scope and decisions

- [ ] Confirm photo limit, per-image limit, and total upload limit.
- [ ] Decide which photo Gemini analyzes and how the user can change that selection.
- [ ] Define public timeline events versus moderator-only notes.
- [ ] Define reviewer roles, privilege assignment, and how credentials are represented.
- [ ] Decide whether to support duplicate, unsuitable, rejected, or appealed reports.
- [ ] Define inspection, treatment, and follow-up event types and required evidence.
- [ ] Set image, report, coordinate, and audit-history retention/deletion rules.
- [ ] Decide whether reporters need accounts and what edit/delete rights they receive.
- [ ] Choose the intended deployment scope: local demo, private pilot, or public service.

## Stage 2: Design trust and review workflow

- [ ] Map report states and allowed state transitions.
- [ ] Specify reviewer queue filters and duplicate review behavior.
- [ ] Design an append-only audit event with actor, time, action, before/after values, and reason.
- [ ] Decide which audit events are shown publicly and which remain private.
- [ ] Define second-review or dispute handling.
- [ ] Review access rules so moderator credentials are never present in the mobile app.

## Stage 3: Design multiple-photo reporting

- [ ] Design add-from-camera/library flow with thumbnails, removal, and reordering.
- [ ] Decide how the primary/Gemini image is selected and shown to the user.
- [ ] Specify supported file types, resizing/compression, upload limits, and failure recovery.
- [ ] Design one-to-many photo storage and a migration plan from the MVP single-photo field.
- [ ] Define photo order, captions/angle labels, and access/privacy behavior.

## Stage 4: Design report details and activity

- [ ] Sketch collapsed report card and expanded detail screen.
- [ ] Include photo gallery, species/catalog provenance, location privacy, notes, and current status.
- [ ] Design a chronological activity timeline for public events.
- [ ] Separate reviewer-only notes from public activity.
- [ ] Define loading, empty, offline, deleted-photo, and permission-denied states.

## Stage 5: Define impact tracking

- [ ] Design inspection, treatment, and follow-up events as distinct records.
- [ ] Define allowed outcome values and evidence requirements.
- [ ] Decide how before/after photos relate to report photos.
- [ ] Define candidate metrics and how incomplete coverage/uncertainty is displayed.
- [ ] Ensure a verified sighting is not counted as treatment or eradication.

## Stage 6: Validate with users before implementation

- [ ] Review the proposed workflows with at least one community reporter.
- [ ] Review moderator workflow with a qualified reviewer, if one is available.
- [ ] Confirm no organization or reviewer endorsement is implied without approval.
- [ ] Rank features by user value, feasibility, privacy impact, and maintenance cost.
- [ ] Write acceptance criteria and a phased implementation plan after decisions are made.

