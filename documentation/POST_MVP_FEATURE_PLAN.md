# Spot the Spread — Post-MVP Feature Plan

## Purpose

Capture potential improvements after the current MVP. This is a planning document only: none of the features below are approved for implementation yet. The MVP remains the working photo-assisted reporting, FISC matching, community map, and manual PocketBase moderation flow.

## Product direction

Make community reports easier to assess, make reviewer decisions traceable, and measure what follow-up happens after a sighting. Keep the distinction clear between a submitted report, an expert-reviewed identification, and a documented field action.

## Feature areas

### 1. Multiple photos per report

Let a reporter add several photos or angles while preparing a report. Show a thumbnail tray so they can review, remove, or reorder images before submission. One selected photo is used for Gemini identification; the rest are supporting evidence attached to the report.

Open design questions:

- Maximum photos per report and total upload size. Suggested starting point: up to five photos, with a per-image size limit.
- Whether to require a primary photo or choose the first image automatically.
- Whether the user can run Gemini on another photo after the initial suggestion.
- Image retention and removal rules.

### 2. Expandable report cards and detail view

Keep the current feed scannable, but let a card open into a report detail view with:

- Photo gallery and observation information.
- Common and scientific names, FISC match/category/source, and the original Gemini suggestion where relevant.
- Current review status and an activity timeline.
- Location precision wording and the reporter's note.
- Follow-up events, when present.

The timeline should distinguish public report history from moderator-only notes. Never expose reporter identity or precise coordinates without the appropriate consent.

### 3. Trust, moderation, and review history

Replace the single-admin moderation pattern with clearly scoped roles and a traceable review workflow.

Potential capabilities:

- Roles such as reporter, moderator, and trusted reviewer, with least-privilege access.
- A review queue for unverified reports, filters for status/category/age, and duplicate candidates.
- Review actions that can correct the identification, set `verified` or `needs_review`, or flag a report as a duplicate or unsuitable.
- An append-only audit history containing reviewer, timestamp, action, previous value, new value, and reason.
- Publicly visible review events that explain status changes, while private moderator notes remain restricted.
- An appeal or second-review path for disputed identifications.

Reviewer labels must describe the account's app role. Do not imply a partner organization, professional credential, or endorsement unless verified and authorized.

### 4. Follow-up and measurable impact

Record field actions as separate events rather than treating a verified sighting as proof of environmental impact.

Possible follow-up events:

- Site inspected, with date and reviewer.
- Treatment or removal attempted, with method and area/quantity where practical.
- Follow-up check, with observed regrowth or no regrowth.
- Before/after photos and a concise outcome note.

Candidate dashboard measures:

- Reports submitted and reports verified, shown separately.
- Unique sites inspected and time from report to first review/inspection.
- Sites with treatment recorded and sites with follow-up completed.
- Follow-up outcomes, including recurrence, with the observation window stated.

Avoid claiming plants were eradicated or ecological conditions improved unless the app has evidence and a defined verification process. Show coverage and uncertainty alongside counts.

### 5. Additional ideas for later prioritization

- Offline report drafts and a reliable upload queue.
- Duplicate-sighting suggestions based on species, time, and approximate distance.
- Map filters, clusters, and trends by time/status/species.
- Notifications for review outcomes or nearby verified sightings, with explicit opt-in.
- Catalog refresh workflow with source/version history and review before updates go live.
- Abuse prevention, account recovery, data export/retention controls, and deployment hardening before any public launch.

## Suggested delivery order

1. Agree on roles, visibility, photo limits, and what counts as an impact event.
2. Design the report, media, audit-event, and follow-up-event data model, including migration from the MVP's single-photo field.
3. Add moderator access control and review history before expanding public reporting.
4. Add multi-photo capture and the report detail/timeline experience.
5. Add field follow-up events and impact summaries.
6. Consider offline support, alerts, and analytics after validating the core workflow with reviewers and reporters.

This order is a proposal. It should change if the team identifies a more important user need or a confirmed partner workflow.

## Decisions still open

1. **Photo set:** maximum photos, per-image/total size limits, and which image Gemini analyzes.
2. **Activity visibility:** which events are public, which notes are moderator-only, and whether reviewer names are shown.
3. **Reviewer trust:** who can receive reviewer privileges and how credentials or expertise are described/verified.
4. **Review states:** whether to add `rejected`, `duplicate`, or appeal states, and who can apply them.
5. **Impact definitions:** which inspection/treatment outcomes can be recorded and what evidence is required.
6. **Location and images:** retention period, deletion requests, and who can access original photos and exact coordinates.
7. **Identity:** whether reports stay anonymous or support accounts and reporter-owned edit/delete requests.
8. **Deployment:** whether the next version remains a local demo or targets a hosted service and public users.

## Initial success criteria to refine

- Reviewers can explain and reproduce every status or identification change from the audit history.
- A reporter can attach the intended photo angles without losing track of which photo Gemini analyzed.
- A community member can distinguish unverified reports, verified reports, and field follow-up outcomes.
- Impact summaries count only documented events and display the date range and coverage.
- Public views continue to omit reporter identity and protect exact location unless the reporter opts in.

