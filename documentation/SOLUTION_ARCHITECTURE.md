# Spot the Spread — Solution Architecture

## Goal

Build a React Native app for Orange County, Florida, where community members can report possible invasive plant sightings, see reports on a shared map, and distinguish public reports from expert-reviewed findings. A plant absent from the reference catalog must never be treated as confirmed non-invasive.

## System overview

```text
Expo / React Native mobile app
  ├─ Camera and photo library
  ├─ User confirmation, catalog search, and manual name entry
  ├─ Device location and map pin confirmation
  ├─ Leaflet map rendered in WebView with OpenStreetMap tiles
  └─ HTTPS/HTTP API requests (LAN for the hackathon demo)
          │
          ▼
Node.js API service (team laptop)
  ├─ Gemini API proxy for tentative photo identification
  ├─ FISC catalog matching and report validation
  ├─ Account sign-up, sign-in, and per-member contribution metrics
  ├─ Public report projection and location generalization
  └─ PocketBase server-side access and role checks
          │
          ▼
PocketBase (team laptop)
  ├─ app_accounts collection: regular accounts and one configured moderator
  ├─ species collection: versioned FISC snapshot
  └─ reports collection: uploader link, images, sightings, consent, and review status
```

## Main data flow

1. A community member creates an account or signs in. Public sign-up always assigns the regular `user` role.
2. The member takes or uploads a plant photo.
3. The app may send the image to the Node API, which calls Gemini. Gemini returns a *tentative* plant name and confidence/notes when available. The Gemini key stays on the server.
4. The member confirms the suggestion, searches and selects another FISC entry, or enters a plant name not found in the catalog. Gemini failure does not prevent manual identification.
5. The API compares the confirmed name against the FISC snapshot. A match is described as “listed by FISC” with its category and source. No match remains reportable as a possible unlisted invasive.
6. The member confirms the sighting location and chooses whether exact coordinates may be displayed publicly.
7. The API stores the report, photo, and private uploader ID in PocketBase with status `unverified`. The private record retains exact coordinates for review. Public map output omits account identity and generalizes coordinates unless the member opts into exact display.
8. The configured moderator reviews reports and can update identifications and statuses. Moderator metrics show aggregate totals and per-member contribution counts.

## Core records

### Species catalog

- Scientific name, common names, and synonyms
- FISC category (I or II) and Florida zone
- Source URL, snapshot/version, and retrieval date
- Catalog match means only that the plant appears in the imported FISC list; it is not a legal determination

The initial catalog is the versioned snapshot at `data/fisc-species.json`, sourced from the [FISC plant list](https://www.floridainvasives.org/plant-list/2023-invasive-plant-species/). Refresh it deliberately and review data changes before importing.

### Sighting report

- Photo, user-confirmed or entered plant name, and optional note
- Gemini suggestion, kept as a suggestion rather than the user's final identification
- FISC match and category, if present
- Observation timestamp and exact coordinates
- Explicit consent for exact public coordinates
- Private uploader ID and account-linked contribution totals; account identity is omitted from public API responses
- Public coordinate projection and moderation status (`unverified`, `verified`, or `needs_review`)

Reporter identity is not included in the public map response. Account-linked metrics and member email are visible only to the moderator. Existing reports from before account sign-in remain anonymous.

## Stack and service boundaries

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Mobile app | Expo + React Native + TypeScript | Photo capture, tentative ID confirmation, catalog selection, location, report submission, and map |
| Identification | Gemini API through Node service | Optional photo-based suggestion; never authoritative |
| API | Node.js + Express | Secret protection, account roles, contribution metrics, FISC matching, report validation, privacy-safe map output, and PocketBase access |
| Database/files | Self-hosted PocketBase | User accounts, catalog snapshot, report metadata, photos, and review history |
| Map | Leaflet in Expo WebView + OpenStreetMap tiles | Interactive community map without a custom native map build |

## Privacy and safety rules

- Never bundle Gemini or PocketBase superuser credentials in the mobile app.
- Public account registration can only create regular member accounts; the moderator role is seeded from backend environment settings.
- Never expose a raw precise coordinate in public API output when the reporter has not opted in.
- Do not expose reporter identity on the community map.
- Keep every submitted report `unverified` until a moderator reviews it.
- Do not imply an agency or expert organization is a partner without an established partnership.
- Treat Gemini results as tentative; let users correct them and report unlisted plants.
- The hackathon setup is LAN-only and is not production-ready for public deployment.

## Current MVP limitations

- Gemini and map tiles require internet access; Gemini is optional and may fail or be quota-limited.
- PocketBase and the API must remain running on the team laptop for map synchronization and submission.
- Moderator review is manual in PocketBase; there are no app roles, notifications, or agency integration.
- Account sessions are stored in API memory and end when the API restarts. Registration has no email verification, password reset, or abuse controls; do not expose this setup to an untrusted network.
