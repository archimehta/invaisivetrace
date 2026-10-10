# InvAIsive Trace: Implemented MVP

## Product behavior

- Expo mobile app for Orange County possible invasive plant reports.
- Gemini suggests a tentative identification; users can confirm it, choose any item from the Florida Invasive Species Council (FISC) Categories I/II catalog, or enter an unlisted plant name.
- FISC match labels a report with category and source. No match means “not found in the FISC catalog,” never “not invasive.” Both listed and possible unlisted sightings can be reported.
- Reports start `unverified`; a moderator reviews and changes status in PocketBase.
- Public registration creates normal member accounts. The API seeds one moderator account from backend environment settings; uploaded reports are linked privately to the submitting account for participation metrics.
- Public map shows exact coordinates only with explicit opt-in; otherwise it shows coordinates rounded to three decimal places. Precise coordinates remain available to the moderator.

## Architecture

```text
Expo / React Native
  ├─ image picker + location permission
  ├─ bundled FISC catalog for manual search
  ├─ Leaflet map in Expo Go WebView + OpenStreetMap tiles
  └─ local Node API (same Wi-Fi)
       ├─ Gemini image identification (API key stays on laptop)
       ├─ FISC name matching and coordinate generalization
       └─ PocketBase superuser access, account roles, and private uploader attribution
            ├─ species: full FISC snapshot
            └─ reports: photo, identification, exact/public coordinates, review state
```

The mobile app never receives PocketBase superuser credentials. The API exposes a public projection of report fields and proxies report images. Only the configured moderator can view member contribution metrics or use moderation endpoints.

## Dataset and status rules

`data/fisc-species.json` contains the full 179-entry FISC Category I/II table published as the April 2026 list. Records preserve common names, scientific name, synonyms, Florida zone, category, source URL, version, and retrieval date. Orange County maps to the FISC Central zone (`C`). FISC describes this as an ecological reference, not a legal/regulatory determination. See [the FISC source page](https://www.floridainvasives.org/plant-list/2023-invasive-plant-species/).

Refresh the snapshot with `npm run catalog:import` after checking the upstream table and reviewing the data diff. The backend syncs catalog records into PocketBase at startup. It does not scrape FISC on every app launch.

## Limitations

- Gemini can misidentify plants; users are asked to confirm or correct its suggestion.
- The prototype has basic accounts but no email verification, password reset, abuse controls, notification pipeline, or agency integration.
- Moderator verification is manual through PocketBase; no external ecological organization is represented as a partner.
- The map requires internet access for OpenStreetMap tiles and Leaflet CDN assets.
- The backend is intended for the hackathon LAN demo, not public deployment as-is.
