#!/usr/bin/env python3
"""Import the current FISC Category I/II table into a versioned JSON catalog.

Usage:
  python3 scripts/import_fisc.py
  python3 scripts/import_fisc.py --input /path/to/fisc-page.html

Uses only Python's standard library. The generated catalog is a snapshot; rerun
the importer and review the diff when FISC updates its published list.
"""

from __future__ import annotations

import argparse
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

SOURCE_URL = "https://www.floridainvasives.org/plant-list/2023-invasive-plant-species/"
SOURCE_VERSION = "April 2026"
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "fisc-species.json"


class FiscTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_table = False
        self.in_body = False
        self.in_row = False
        self.in_cell = False
        self.table_id = None
        self.cell_text = ""
        self.row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag == "table" and attr.get("id") == "tablepress-4":
            self.in_table = True
        elif self.in_table and tag == "tbody":
            self.in_body = True
        elif self.in_body and tag == "tr":
            self.in_row = True
            self.row = []
        elif self.in_row and tag == "td":
            self.in_cell = True
            self.cell_text = ""
        elif self.in_cell and tag == "br":
            self.cell_text += " "

    def handle_endtag(self, tag: str) -> None:
        if tag == "td" and self.in_cell:
            self.row.append(re.sub(r"\s+", " ", self.cell_text).strip())
            self.in_cell = False
        elif tag == "tr" and self.in_row:
            if self.row:
                self.rows.append(self.row)
            self.in_row = False
        elif tag == "tbody":
            self.in_body = False
        elif tag == "table" and self.in_table:
            self.in_table = False

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.cell_text += data


def fetch_html() -> str:
    request = Request(SOURCE_URL, headers={"User-Agent": "SpotTheSpread/1.0 (FISC catalog import)"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Parse a previously downloaded FISC HTML page")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    html = args.input.read_text(encoding="utf-8") if args.input else fetch_html()
    table = FiscTableParser()
    table.feed(html)
    if not table.rows:
        raise SystemExit("Could not find the FISC TablePress table (tablepress-4). Review the source page.")

    species = []
    for row in table.rows:
        if len(row) < 4:
            continue
        scientific_raw, common_raw, zones_raw, category_raw = row[:4]
        category = category_raw.strip().upper()
        if category not in {"I", "II"} or not scientific_raw:
            continue

        # The table sometimes includes taxonomic synonyms or footnote marks.
        cleaned_scientific = re.sub(r"\s*[123*]+$", "", scientific_raw).strip()
        scientific_parts = re.split(r"\s*\(([^()]*)\)", cleaned_scientific)
        scientific_name = scientific_parts[0].strip()
        scientific_synonyms = [part.strip() for part in scientific_parts[1::2] if part.strip()]
        common_names = [name.strip() for name in common_raw.split(";") if name.strip()]
        zones = [zone.strip() for zone in zones_raw.replace(" ", "").split(",") if zone.strip()]
        species.append({
            "id": re.sub(r"[^a-z0-9]+", "-", scientific_name.lower()).strip("-"),
            "scientificName": scientific_name,
            "scientificSynonyms": scientific_synonyms,
            "commonNames": common_names,
            "zones": zones,
            "category": f"Category {category}",
            "region": "Florida",
            "sourceName": "Florida Invasive Species Council invasive plant list",
            "sourceUrl": SOURCE_URL,
            "sourceVersion": SOURCE_VERSION,
            "sourceRetrievedAt": date.today().isoformat(),
        })

    unique = {entry["id"]: entry for entry in species}
    result = list(unique.values())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(result)} FISC Category I/II plants to {args.output}")


if __name__ == "__main__":
    main()
