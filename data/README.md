# FISC Catalog Snapshot

`fisc-species.json` contains the 179 plant rows in FISC's April 2026 Category I and II list. The names and categories come from [FISC's published plant list](https://www.floridainvasives.org/plant-list/2023-invasive-plant-species/). Each row retains its category, Florida zone, common names, scientific synonyms, source URL/version, and retrieval date.

This is a versioned snapshot, not a live scrape. To refresh it, run `npm run catalog:import`, inspect and review the diff, and commit the resulting JSON. The importer uses only Python's standard library. For an already downloaded source page, run `python3 scripts/import_fisc.py --input /path/to/page.html`.

FISC Categories I and II are used as a cited reference. A missing match is not evidence that a plant is non-invasive. Unmatched reports are retained as possible unlisted invasives for moderator review.
