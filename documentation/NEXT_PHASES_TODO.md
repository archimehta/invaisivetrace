# Spot the Spread — Next Phases To-do List

The mobile app, API, and FISC catalog scaffold are in the workspace. This checklist takes the project from scaffold to a working, judge-ready MVP.

## Phase 1: Set up the development environment

- [x] Confirm Node.js 20.19+ is installed (v24.20.0 on the development laptop).
- [ ] Install Expo Go on the test phone.
- [x] Install app dependencies from the project root with `npm install`.
- [x] Install API dependencies from `backend/` with `npm install`.
- [x] Copy `.env.example` to `.env` in the project root and set `EXPO_PUBLIC_API_URL` to the laptop's current LAN address (`10.32.218.232:8787`). Update it if the network changes.
- [x] Copy `backend/.env.example` to `backend/.env`.
- [ ] Set the PocketBase superuser credentials in `backend/.env` to match the account created during PocketBase initialization; optionally add a Gemini API key/model.
- [x] Download the official PocketBase macOS ARM64 executable to the ignored local folder `.local/pocketbase/` (version 0.40.5).
- [ ] Keep PocketBase and the API on a trusted private network when running them.

## Phase 2: Start the services and app

- [x] Start PocketBase and create its local superuser account (the API health check confirms the backend is connected).
- [x] Start the Node API and confirm `/api/health` responds (`catalogCount: 179`; Gemini is currently disabled).
- [x] Start Expo with LAN access; QR is ready. Scan it with Expo Go on the test phone.
- [ ] Confirm the phone and laptop are on the same Wi-Fi and the app can reach the API.
- [ ] Confirm the FISC catalog syncs to PocketBase and is searchable in the app (API search for Hydrilla returned a Category I match).
- [ ] Confirm map tiles load and the location picker can set a pin.

## Phase 3: Verify identification and catalog behavior

Progress: API catalog search works (Hydrilla returns Category I; an unknown search returns no matches), and the identify endpoint gives a clear manual-identification fallback when Gemini is unset. Live Gemini identification still requires a key in `backend/.env`. Retest camera and photo-library access on the iPhone after the permission fix.

- [ ] Configure Gemini on the backend and try a clear plant photo.
- [ ] Confirm Gemini's result is labeled tentative and requires user confirmation.
- [ ] Correct a wrong suggestion by searching the FISC catalog.
- [ ] Enter a plant name absent from FISC and confirm it remains eligible for reporting as a possible unlisted invasive.
- [ ] Confirm an unmatched plant is labeled “not found in the FISC catalog,” never “not invasive.”
- [ ] Disable or break Gemini temporarily and confirm catalog search/manual entry still work.

## Phase 4: Verify reporting and community map

- [ ] Submit a FISC-listed plant report and confirm its category/source and `unverified` status.
- [ ] Submit an unlisted possible invasive report and confirm it also appears as `unverified`.
- [ ] Open the map as another app session/user and confirm reports are visible without reporter identity.
- [ ] Confirm exact public coordinates are used only after explicit opt-in.
- [ ] Confirm coordinates are generalized when the reporter does not opt in.
- [ ] Check behavior when location permission is denied, the API is offline, or map tiles are unavailable.

## Phase 5: Verify moderation

- [ ] Open a report in PocketBase and update its identification or status to `verified` or `needs_review`.
- [ ] Confirm updated status and identification appear on the community map.
- [ ] Prepare a repeatable moderator workflow for the demo; do not represent any agency or expert organization as a partner unless that is confirmed.

## Phase 6: Prepare and rehearse the demo

- [ ] Fix any setup, runtime, or layout issues found in the phone walkthrough.
- [ ] Test on a second platform if a suitable device is available.
- [ ] Prepare sample plant photos, one FISC-listed example, and one unlisted example.
- [ ] Rehearse: identify → confirm/correct → set location/privacy → submit → view on map → moderate.
- [ ] Keep the API, PocketBase, and Expo running; ensure phone connectivity before judging.
- [ ] Explain that Gemini suggestions are tentative, FISC matching is a reference-list lookup, and reports remain unverified until reviewed.

## Recommended order

Get the app and backend running first. Verify reporting and the map without relying on Gemini, then add and demonstrate Gemini identification. Finish with moderation, privacy checks, and a short phone rehearsal so an external API outage does not block the core demo.
