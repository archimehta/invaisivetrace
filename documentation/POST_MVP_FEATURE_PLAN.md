# Spot the Spread — Post-MVP Feature Plan

## Purpose and scope

This document records the agreed direction for improving the hackathon demo after its MVP. The app is for a private/demo setting, not a public release or hosted public service. The implementation status below tracks what is now in the codebase and what still needs validation.

## Implementation status

The account model now uses regular member registration and one environment-configured moderator. Reports are linked privately to the submitting member; a moderator-only dashboard exposes community totals and contribution counts. Existing reports remain anonymous. Review workflows continue through moderator-only API routes.

The current MVP remains the baseline: Expo React Native, the existing backend and PocketBase catalog, Gemini-assisted tentative identification, and the community report map. Future work should preserve the distinction between a user-submitted identification and a verified report, and between a verified sighting and evidence of ecological impact.

## Decisions locked in

### Reporting photos

- A report has one primary plant photo, used for Gemini identification or manual identification.
- While completing the report, the reporter may add up to three supporting photos showing other angles or the surrounding scene. A report can therefore contain up to four photos total.
- Each photo is limited to 5 MB.
- All report photos are visible to users who can see that report. Strip image metadata before upload so embedded metadata does not expose unintended location or device details.
- Reporters are anonymous. The app does not need a public reporter account system for this demo.

The MVP currently stores one photo per report. Future implementation will need a one-to-many photo representation and a migration path for existing reports. Gemini uses the primary photo; supporting images provide context to people reviewing the report.

### Trust, review, and public activity

- New reports appear immediately with `unverified` status.
- Public sign-up always creates a regular member; the moderator role comes only from backend environment configuration.
- Public report activity is visible to users. Attribute actions to a role and public reason (for example, “Moderator”), not to a reviewer's personal identity. Do not add private reviewer notes in this demo workflow.
- Review states include `unverified`, `needs_review`, `verified`, and `rejected`.
- Rejected reports are hidden from the public map and list. Their report and review history remain available to moderators unless a moderator deletes them.
- Keep the existing location-consent rule: exact public coordinates are used only when the reporter explicitly opts in; otherwise use an approximate public pin.

### Impact and follow-up

Only invited reviewers can add follow-up events. Supported event types are `inspection`, `treatment`, and `follow-up`. Every event requires a date and note; photos are optional.

Track counts separately for verified reports, inspections, treatments, and follow-up outcomes. A verified report is evidence of a reviewed sighting, not proof of treatment, eradication, or ecological improvement. Recurrence or no-regrowth can be shown as a recorded follow-up outcome, not as a broader claim beyond the submitted evidence.

### Report detail experience

Tapping a report card expands its details inline in the scrollable list. The expanded content should provide a clean view of its photos, identification and catalog evidence, location precision, current status, public activity, and reviewer-recorded impact events.

### Retention

Reports and their public review history remain available until a moderator deletes them. Moderator deletion removes them from public views as well.

## Proposed future behavior and data changes

These are planning-level requirements for a later implementation phase:

- Replace the singular report photo in the app/API representation with an ordered collection, identifying one image as primary and the rest as supporting images.
- Return the public photo collection and public activity timeline with report details, subject to report visibility and the existing coordinate-consent behavior.
- Represent review actions and impact events as timestamped records. Public review activity identifies the actor's role and includes a public reason; it does not expose personal reviewer identity or private notes.
- Represent impact events separately from review status so a status change cannot be mistaken for treatment or an outcome.
- Update report cards to expand inline and show the report's details and event history.
- Preserve existing reports during the future migration from the MVP's single-photo field.

The precise PocketBase collection names, endpoint shapes, reviewer credential mechanics, image-processing library, and migration execution plan remain implementation design choices for the future work phase.

## Suggested future sequencing

1. Design the report details expansion and multi-photo flow together so users understand which image is analyzed and how supporting views help reviewers.
2. Design public review activity and the invite-only reviewer workflow, including state transitions and rejection visibility.
3. Design follow-up events and impact summaries with clear labels that avoid overstating results.
4. Plan the data migration from one photo to an ordered photo set and add acceptance scenarios before implementation.
5. Implement and demo these features incrementally against the existing local demo stack.

## Acceptance scenarios for future implementation

- A report can include one primary photo and up to three additional photos; an attempt to add a fifth photo or a photo larger than 5 MB is handled clearly.
- Gemini analyzes the primary image. The reporter can still identify manually if Gemini is unavailable.
- Every uploaded photo has metadata stripped before storage and is visible wherever the report is publicly visible.
- A new report appears as unverified. A reviewer can change its status and provide a public reason; activity displays the reviewer role without personal identity.
- A rejected report disappears from the public map and list while remaining available to moderators until deleted.
- A reviewer can record an inspection, treatment, or follow-up with a date and note, and optionally attach photos.
- Summary counts distinguish verified reports, inspections, treatments, and follow-up outcomes.
- Expanding a report card inline shows its details, public history, and impact events.
- Existing MVP reports remain readable after the photo-data migration.
- Public coordinates remain exact only when the reporter opted in.

## Later ideas, lower priority

These ideas are not part of the locked initial post-MVP scope and should be ranked after the features above:

- Offline drafts and upload queue.
- Duplicate report detection.
- Map filters, clustering, and trend views.
- Opt-in notifications.
- A catalog refresh workflow.
- Abuse hardening, account recovery, and data export before any actual public launch.

## Explicitly out of scope for this demo plan

- Public release, public hosting, or a production service.
- A reporter account system.
- Claims of participation or endorsement by Orange County Ecological Services or another organization unless a partnership is established.
- Any app-code, database-schema, or MVP behavior changes as part of this planning document update.
