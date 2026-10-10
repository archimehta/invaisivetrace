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
  ├─ Public report projection and location generalization
  └─ PocketBase server-side authentication
          │
          ▼
PocketBase (team laptop)
  ├─ species collection: versioned FISC snapshot
  └─ reports collection: images, sightings, consent, and review status
```

## Main data flow

1. The user takes or uploads a plant photo.
2. The app may send the image to the Node API, which calls Gemini. Gemini returns a *tentative* plant name and confidence/notes when available. The Gemini key stays on the server.
3. The user confirms the suggestion, searches and selects another FISC entry, or enters a plant name not found in the catalog. Gemini failure does not prevent manual identification.
4. The API compares the user-confirmed name against the FISC snapshot. A match is described as “listed by FISC” with its category and source. No match is described as “not found in the FISC catalog”; it remains reportable as a possible unlisted invasive.
5. The user confirms the sighting location and chooses whether exact coordinates may be displayed publicly.
6. The API stores the report and photo in PocketBase with status `unverified`. The private record retains exact coordinates for review. The public map projection uses exact coordinates only with explicit consent; otherwise it generalizes them.
7. A moderator reviews the report in the PocketBase dashboard and can update its identification and status to `verified` or `needs_review`. The map displays the current status.

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
- Public coordinate projection and moderation status (`unverified`, `verified`, or `needs_review`)

Reporter identity is not included in the public map response. The prototype currently supports anonymous reports and manual moderation.

## Stack and service boundaries

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Mobile app | Expo + React Native + TypeScript | Photo capture, tentative ID confirmation, catalog selection, location, report submission, and map |
| Identification | Gemini API through Node service | Optional photo-based suggestion; never authoritative |
| API | Node.js + Express | Secret protection, FISC matching, report validation, privacy-safe map output, and PocketBase access |
| Database/files | Self-hosted PocketBase | Catalog snapshot, report metadata, photos, moderator dashboard |
| Map | Leaflet in Expo WebView + OpenStreetMap tiles | Interactive community map without a custom native map build |

## Privacy and safety rules

- Never bundle Gemini or PocketBase superuser credentials in the mobile app.
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
- Anonymous submission has no abuse controls. Do not expose this setup to an untrusted network.
