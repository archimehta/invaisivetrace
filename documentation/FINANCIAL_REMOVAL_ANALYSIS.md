# Spot the Spread — Removal Cost Estimation Build Checklist

Status: Step 1 behavior decisions are complete. Step 2 database/API contracts must be reviewed before feature implementation. This document is a build checklist, not an implementation of the feature.

## Agreed behavior

- Estimates apply to verified, FISC-listed reports anywhere in Florida.
- Moderators enter estimated infested area in square feet through a new mobile review form. Verification can proceed without coverage: moderators see **Coverage needed**, and public users see no cost estimate.
- Estimate total USD cost for one removal visit including labor, treatment materials, and disposal; exclude repeat visits and restoration.
- Trigger estimation through backend API actions only; direct PocketBase dashboard edits do not trigger it.
- Verification saves immediately. Estimation runs in the background with persisted jobs, bounded retries, and moderator retry controls.
- Automatically publish estimates only when validated and supported by relevant pricing evidence. Otherwise show **Estimate unavailable**.
- Add an expandable cost section to Sightings cards; full photo/activity expansion is outside this feature.
- Existing verified reports can receive estimates when moderators add coverage and request generation. No automatic bulk backfill.
- Species or coverage changes invalidate and regenerate eligible estimates. Leaving verified hides estimates. Treatment events mark estimates stale until moderator reassessment.
- Store the latest estimate plus supporting metadata, not full estimate history.
- Use REST with separate cost-estimation configuration; preserve the existing photo-identification integration.

## Step 1 — Clarification decisions (complete)

- [x] Determine Florida eligibility and county pricing context on the backend using report coordinates against geographic boundaries. Unresolved locations remain verified but receive no estimate until resolved. Do not infer membership from UI labels or send precise coordinates to Gemini.
- [x] Require explicit pricing plus a separate corroborating pricing source, both dated within 24 months. Prefer the report’s county or nearby region; allow Florida-wide pricing with the geographic assumption disclosed. General removal guidance alone does not substantiate a price.
- [x] Refresh every 10 seconds while the relevant screen is visible and estimates are pending. Stop after two minutes or on navigation/unmount; provide manual refresh. Stop requests while the app is backgrounded.
- [x] Initial operating limits: 30-second Gemini request timeout, three total attempts per job, retries after one and five minutes, one active request, and a configurable cap of 50 attempts per day. Retries count toward the cap.
- [x] Stale-estimate presentation: hide the public price and show reassessment is needed; moderators confirm or update remaining area before regeneration.
- [x] Keep exact schema/API contract review as the next Step 2 checkpoint before implementation; Step 1 completion does not approve unreviewed database, API, or frontend changes.

## Step 2 — Define, review, then add database/API contracts

- [ ] Define report fields for optional coverage, county eligibility/provenance, estimate status, USD bounds, method, rationale, scope/exclusions, structured source titles/URLs, generation time, and input snapshot/version.
- [ ] Define estimate states for coverage needed, ineligible/not requested, pending, ready, unavailable, and stale. Keep them separate from reviewStatus.
- [ ] Define persisted job data: report reference, input version, attempts, next attempt time, processing lease, and internal diagnostics.
- [ ] Confirm PocketBase missing-number behavior; use explicit estimate status rather than assuming optional numbers store null or treating zero as missing.
- [ ] Add compatible additive changes to backend startup schema setup and PocketBase migrations. Preserve existing records and collection access rules; document rollback limitations.
- [ ] Extend the report API projection and TypeScript Report type. Expose prices only when the report is eligible and the estimate is ready and current; keep internal job diagnostics private.
- [ ] Extend the existing review endpoint to accept optional moderator coverage; define a moderator-only action for coverage updates, generation, and retry on already verified reports.
- [ ] Validate finite positive coverage and agreed practical upper bounds. Reject unauthorized changes and caller-supplied generated prices or sources.

## Step 3 — Build the grounded estimation service

- [ ] Create a backend REST service with separate cost-model, timeout, retry, concurrency, and budget settings. Keep the Gemini key server-side.
- [ ] Verify selected model support for Google Search grounding and output formatting against current official documentation before implementing requests.
- [ ] Send confirmed identification, FISC category, coverage, Florida locality context, and agreed job scope. Exclude reporter identity, photos, free-form notes, and precise coordinates.
- [ ] Request structured price bounds, USD currency, method, rationale, assumptions, and an explicit insufficient-evidence outcome.
- [ ] Extract actual grounding sources and connect pricing claims to evidence; reject invented citations and unsupported price ranges.
- [ ] Validate finite nonnegative bounds, minimum no greater than maximum, units/scope, and sufficient pricing evidence.
- [ ] Distinguish transient failures from invalid output or insufficient evidence; sanitize internal diagnostics.

## Step 4 — Integrate review and persisted background work

- [ ] Preserve existing review permissions, required public reasons, status transitions, identification correction, and activity recording in backend/server.mjs.
- [ ] Save verification without waiting for Gemini; absent coverage must not block verification.
- [ ] Queue eligible work after verification or a later coverage action. Recover queue failures without reversing verification.
- [ ] Implement a worker that resumes persisted work after restart, recovers expired leases, and enforces retry/backoff and request limits.
- [ ] Prevent duplicate jobs for the same report/input version. Recheck current eligibility and inputs before publishing; discard superseded responses.
- [ ] Invalidate on species or coverage changes, including identification correction without a status change; regenerate when eligible.
- [ ] Hide estimates after leaving verified and prevent in-flight publication. Mark stale after treatment and require moderator reassessment.
- [ ] Support coverage entry and generation for existing verified reports without forcing another status transition.
- [ ] Cancel/cascade work when reports are deleted. Never recreate deleted records from worker results.
- [ ] Mark exhausted failures unavailable and support moderator retry.

## Step 5 — Build moderator review UI

- [ ] Add a moderator-only report review form using existing authentication and backend review APIs.
- [ ] Include identification correction, allowed status actions, required public review reason, and optional area in square feet.
- [ ] Show Coverage needed on verified reports without area, with later coverage entry and generation.
- [ ] Show pending, ready, unavailable, and stale status; provide appropriate generation/retry/reassessment controls.
- [ ] Prevent repeated taps from creating duplicate actions. Verification must visibly succeed even when estimation is disabled or unavailable.
- [ ] Preserve the reporter submission flow without new coverage requirements.

## Step 6 — Build public estimate display

- [ ] Add expandable cost sections to src/screens/SightingsScreen.tsx and integrate the new API/type contract.
- [ ] Show USD range, area, method, scope/exclusions, rationale, safe clickable source links, and generation date.
- [ ] Display: “Informational estimate for Florida. Actual contractor quotes vary.”
- [ ] Show Estimate being prepared for eligible pending work and Estimate unavailable after unsuccessful generation. Hide the cost section when coverage is missing or the report is ineligible.
- [ ] Implement agreed stale/refresh behavior without losing expansion, search, or filter state.
- [ ] Check loading/offline states, long source/method text, small screens, accessible expansion controls, and links.

## Step 7 — Verify behavior and compatibility

- [ ] Verify without coverage: status saves, moderator sees Coverage needed, public price is absent, no job runs.
- [ ] Verify with eligible coverage: immediate review success, one persisted job, eventual ready estimate from a mocked grounded response.
- [ ] Exercise unlisted, outside-county, rejected, and unresolved-location eligibility.
- [ ] Exercise species/coverage correction, status changes, and treatment during in-flight requests; obsolete results must never publish.
- [ ] Exercise missing API key, timeout, rate limit, malformed output, invalid bounds, and insufficient sources; verification remains successful.
- [ ] Exercise restart recovery, duplicate requests, expired leases, deletion, retry exhaustion, and request-budget limits.
- [ ] Exercise existing verified reports receiving coverage and moderator retry; confirm no bulk backfill.
- [ ] Validate additive migration/startup against existing records and public projection privacy.
- [ ] Run TypeScript checks and focused backend tests. Manually verify public/moderator screens and one controlled real grounded response before rollout.

## Step 8 — Document and roll out

- [ ] Document configuration, schema, moderation actions, retry behavior, and the API-only trigger limitation in backend documentation.
- [ ] Apply reviewed schema changes to development first; back up the deployment database before rollout.
- [ ] Enable with a small request cap and inspect representative estimates and citations.
- [ ] Monitor pending-job age, retries, unavailable outcomes, upstream usage, and discarded results without logging private data.
- [ ] Confirm disabling estimation leaves reporting and verification operational and prevents stale price display.

Build order: Step 1 is complete; next define and review Step 2 contracts, then implement the approved schema and Steps 3–8. Feature logic, frontend, and database changes remain unimplemented.
