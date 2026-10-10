# Spot the Spread — Post-MVP Feature Plan

## Purpose and scope

This document records the agreed direction for improving the hackathon demo after its MVP. The app is for a private/demo setting, not a public release or hosted public service. The implementation status below tracks what is now in the codebase and what still needs validation.

## Implementation status

The account model uses regular member registration and one environment-configured moderator. New reports are linked privately to the submitting member; public report views omit reporter identity. Existing reports remain anonymous. Moderator review, report details, multi-photo uploads, and impact tracking are implemented in the current app and API. On-device acceptance validation remains.

The current MVP remains the baseline: Expo React Native, the existing backend and PocketBase catalog, Gemini-assisted tentative identification, and the community report map. Future work should preserve the distinction between a user-submitted identification and a verified report, and between a verified sighting and evidence of ecological impact.

## Decisions locked in

### Reporting photos

- A report has one primary plant photo, used for Gemini identification or manual identification.
- While completing the report, the reporter may add up to three supporting photos showing other angles or the surrounding scene. A report can therefore contain up to four photos total.
- Each photo is limited to 5 MB.
- All report photos are visible to users who can see that report. Strip image metadata before upload so embedded metadata does not expose unintended location or device details.
- Reports are public observations, but reporter identity is private. A signed-in member can see their own contribution metrics; only the moderator dashboard can see contributor identity and totals.

The backend retains the MVP primary-photo field and stores supporting photos as ordered linked records, so pre-existing reports remain readable. Gemini uses the primary photo; supporting images provide context to people reviewing the report.

### Trust, review, and public activity

- New reports appear immediately with `unverified` status.
- Public sign-up always creates a regular member; the moderator role comes only from backend environment configuration.
- Public report activity is visible to users. Attribute actions to a role and public reason (for example, “Moderator”), not to a reviewer's personal identity. Do not add private reviewer notes in this demo workflow.
- Review states include `unverified`, `needs_review`, `verified`, and `rejected`.
- Rejected reports are hidden from the public map and list. Their report and review history remain available to moderators unless a moderator deletes them.
- Keep the existing location-consent rule: exact public coordinates are used only when the reporter explicitly opts in; otherwise use an approximate public pin.

### Impact and follow-up

Only authenticated moderators can add follow-up events in this demo. Supported event types are `inspection`, `treatment`, and `follow-up`. Every event requires a date and note; photos are optional.

Track counts separately for verified reports, inspections, treatments, and follow-up outcomes. A verified report is evidence of a reviewed sighting, not proof of treatment, eradication, or ecological improvement. Recurrence or no-regrowth can be shown as a recorded follow-up outcome, not as a broader claim beyond the submitted evidence.

### Report detail experience

Tapping a report card opens a details modal. It provides a clean view of its photos, identification and catalog evidence, location precision, current status, public activity, and reviewer-recorded impact events.

### Retention

Reports and their public review history remain available until a moderator deletes them. Moderator deletion removes them from public views as well.

## Implemented behavior and data model

- Replace the singular report photo in the app/API representation with an ordered collection, identifying one image as primary and the rest as supporting images.
- Return the public photo collection and public activity timeline with report details, subject to report visibility and the existing coordinate-consent behavior.
- Represent review actions and impact events as timestamped records. Public review activity identifies the actor's role and includes a public reason; it does not expose personal reviewer identity or private notes.
- Represent impact events separately from review status so a status change cannot be mistaken for treatment or an outcome.
- Open report details in a modal that shows photos, activity, and event history.
- Preserve existing reports through the single-photo-compatible projection; legacy primary photos remain visible as the first photo.

PocketBase uses `report_photos`, `report_activity`, and `impact_events` collections. The Node API handles reviewer authorization, image normalization, and legacy primary-photo compatibility.

## Remaining work

1. Run the acceptance scenarios with the current PocketBase database and backend.
2. Validate the flows on the judge-facing phone(s), including photo size/upload failures and moderator-only screens.
3. Consider duplicate-report handling and the lower-priority features listed below after demo feedback.

## Acceptance scenarios to validate

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

These ideas are not part of the implemented demo scope and should be ranked after validation:

- Offline drafts and upload queue.
- Duplicate report detection.
- Map filters, clustering, and trend views.
- Opt-in notifications.
- A catalog refresh workflow.
- Abuse hardening, account recovery, and data export before any actual public launch.

## Explicitly out of scope for this demo plan

- Public release, public hosting, or a production service.
- Public display of reporter identity or a public social/profile system.
- Claims of participation or endorsement by Orange County Ecological Services or another organization unless a partnership is established.
