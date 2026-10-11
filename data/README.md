# FISC Catalog Snapshot

`fisc-species.json` contains the 179 plant rows in FISC's April 2026 Category I and II list. The names and categories come from [FISC's published plant list](https://www.floridainvasives.org/plant-list/2023-invasive-plant-species/). Each row retains its category, Florida zone, common names, scientific synonyms, source URL/version, and retrieval date.

This is a versioned snapshot, not a live scrape. To refresh it, run `npm run catalog:import`, inspect and review the diff, and commit the resulting JSON. The importer uses only Python's standard library. For an already downloaded source page, run `python3 scripts/import_fisc.py --input /path/to/page.html`.

FISC Categories I and II are used as a cited reference. A missing match is not evidence that a plant is non-invasive. Unmatched reports are retained as possible unlisted invasives for moderator review.

## Florida county boundaries

`florida-counties.geojson` is a compact offline snapshot of the 67 Florida county geometries from the [U.S. Census Bureau TIGERweb County service](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/7), retrieved 2026-10-10. The backend uses point-in-polygon matching to resolve report coordinates to a county; it does not use the user-entered location label or send coordinates to Gemini. A boundary miss or ambiguous point is unresolved and cannot receive an estimate until a moderator corrects the map pin. Refresh from the Census TIGERweb State/County layer, review feature count and geometry, and update the retrieval date before replacing the snapshot.
