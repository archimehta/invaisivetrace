# Local API and PocketBase

The API runs on the team laptop, authenticates to PocketBase as a local superuser, creates the needed collections, loads the bundled catalog, and serves the app's report API. Keep both devices on the same trusted Wi-Fi.

## 1. Start PocketBase

Download the current PocketBase executable from [pocketbase.io](https://pocketbase.io/), then run it so phones on the LAN can reach it:

```sh
./pocketbase serve --http=0.0.0.0:8090
```

Open `http://127.0.0.1:8090/_/` and create a local superuser. The API creates locked `app_accounts`, `species`, `reports`, photo, review, activity, and impact collections on first start. Do not expose PocketBase's port publicly.

## 2. Configure and start the API

```sh
cd backend
npm install
cp .env.example .env
```

Set `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD` in `backend/.env`. Set `DEMO_MODERATOR_EMAIL` and `DEMO_MODERATOR_PASSWORD` for the single moderator account. If the password is blank on first setup, the API generates one and prints it once in the API terminal; save it. Everyone else creates a normal account from the app's Account tab; public sign-up cannot create moderator accounts. Add `GEMINI_API_KEY` to enable photo identification; leave it blank to use manual search/name entry. `GEMINI_MODEL` can override the identification model. Cost estimation is separately configured with `COST_GEMINI_API_KEY`, `COST_GEMINI_MODEL`, and `COST_MAX_ATTEMPTS_PER_DAY`. Use a Gemini API project with no paid billing attached for the cost key; do not reuse a paid key or add a paid fallback. If the free quota is unavailable, estimates fail closed while reporting and verification continue. Then run:

```sh
npm start
```

The API listens on port 8787. Check `http://127.0.0.1:8787/api/health`. Find the laptop's LAN IP and put `http://<laptop-lan-ip>:8787` in the root `.env` as `EXPO_PUBLIC_API_URL` before starting Expo.

## API routes

- `GET /api/health` — readiness, catalog count, Gemini availability.
- `GET /api/metrics` — public aggregate totals, moderator-confirmed species and area trends, plus an opt-in-name contributor leaderboard.
- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout` — normal member registration and sign-in; the configured moderator signs in through the same endpoint.
- `GET /api/account/metrics` — signed-in member's report, verification, and impact-event totals.
- `POST /api/account/leaderboard-visibility` — signed-in member opt-in/out for display-name visibility; hidden names remain anonymous on the public leaderboard.
- `GET /api/moderation/metrics` — moderator-only community totals and per-member contribution counts.
- `GET /api/species?search=...` — FISC species search.
- `GET /api/reports` — public-safe report projection (no raw precise coordinates when consent is off).
- `POST /api/reports` — create a report with one primary photo.
- `POST /api/reports/:id/photos` — add up to three supporting photos.
- `POST /api/identify` — multipart `photo`; asks Gemini for tentative JSON identification.
- `GET /api/moderation/reports` — moderator queue including rejected reports and private uploader details.
- `POST /api/reports/:id/review` — moderator status and identification updates with a public reason.
- `POST /api/reports/:id/removal-estimate` — moderator `request`, `retry`, or `reassess` action; runs asynchronously.
- `PATCH /api/reports/:id/location` — moderator map-pin correction and county re-evaluation.
- `POST /api/reports/:id/impact-events` — moderator inspection, treatment, or follow-up event.
- `DELETE /api/reports/:id` — moderator-only permanent deletion.
- `/api/files`, `/api/photo-files`, `/api/impact-files` — image proxies; rejected report images are hidden.

The removal-estimate action accepts `{ "action": "request" }`, `{ "action": "retry" }`, or `{ "action": "reassess", "coverageAreaSqFt": 120 }`. A moderator may add optional `coverageAreaSqFt` to the review request; `0` or `null` clears coverage. Location correction accepts `{ "latitude": ..., "longitude": ... }`. Estimate requests never accept client-provided prices, evidence, or sources. The worker stores only its current result and operational job diagnostics; there is no estimate history API.

New reports require a signed-in user and are linked to that account for private contribution metrics. Public report responses omit account identity; the moderator metrics endpoint can see member email and per-account submission totals. Older anonymous reports remain anonymous and are not retroactively attributed. New reports appear immediately with status `unverified`. Photos are limited to 5 MB each, converted to JPEG with metadata removed, and limited to four per report. Tapping a community card opens its detail modal. The moderator can change status, correct identification or location, add infested coverage up to one acre, and request or reassess estimates. Estimates require a verified Category I/II plant, coordinates resolving to a Florida county, and two grounded, recent independent comparable prices covering labor, treatment, and disposal. Rates are normalized and multiplied by the reported area by the backend. The current Gemini 2.5 Search-grounding API does not support schema-enforced structured output together with built-in tools, so the model is prompted for JSON and the backend validates every field and citation before publishing. The job worker persists pending work and resumes it after restarts; it runs one job at a time, with three total attempts at one- and five-minute backoffs and a configurable 50-attempt daily cap. Moderator status changes do not wait for Gemini. Public responses never include exact private coordinates or job diagnostics; cost details are omitted unless the estimate is ready and current. Prices stay hidden after treatment until a moderator confirms remaining coverage. Rejected reports are hidden from the public map and list, but retained in the moderation queue until moderator deletion. The local Node service must remain running for reports and map sync.

Florida county boundaries are bundled in `data/florida-counties.geojson`, sourced from Census TIGERweb and retrieved on 2026-10-10. The dataset is used offline and is not a live geocoder. The migration `pb_migrations/1791665255_added_removal_estimation.js` adds estimation fields and private job/usage collections; the backend also adds missing collection fields on startup. The migration down action removes those collections and report fields, including stored estimate metadata, so back up the PocketBase database before rollback. To disable estimating, blank `COST_GEMINI_API_KEY` and restart the API; report submission and review remain available.

## Local demo security

This prototype is for a private hackathon LAN. It has permissive CORS for Expo Go and no rate limiting or production-grade account recovery. Signed-in sessions are held in API memory and expire when the API restarts. Use a dedicated local PocketBase superuser, never commit `.env`, and keep the service off untrusted/public networks.
