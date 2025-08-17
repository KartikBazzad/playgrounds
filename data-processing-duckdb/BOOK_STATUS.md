# DuckDB WASM Book & Playground — Project Status

Last updated: 2025-08-17

## Overview

A beginner-friendly interactive book with an in-browser DuckDB WASM playground. The book renders Markdown chapters from `public/chapters/`, and the playground enables live SQL against local and remote datasets.

## Chapters

- [x] 01 Introduction (`01-intro.md`)
- [x] 02 Getting Started (Browser & Local) (`02-installation.md`)
- [x] 03 SQL Basics (`03-sql-basics.md`)
- [x] 04 Working with CSV & Parquet (`04-files-and-parquet.md`)
- [x] 05 Performance Tips (`05-performance.md`)
- [x] 06 Ecosystem & Integrations (`06-ecosystem.md`)
- [x] 07 Playground Tutorial (`07-playground-tutorial.md`)
- [x] 08 Extensions in WASM (`08-extensions.md`)
- [x] 09 WASM Troubleshooting (`09-wasm-troubleshooting.md`)
- [x] 10 SQL Cheat Sheet (`10-cheatsheet.md`)
- [x] 11 Case Studies & Patterns (`11-case-studies.md`)
- [x] 12 Data Quality with DuckDB (`12-data-quality.md`)

Planned additions:

- [ ] Advanced SQL Patterns (CTEs, window functions deep dive)
- [ ] Import from Gist / Sharing workflows walkthrough

## Playground Features

Core:

- [x] Execute SQL
- [x] Show tabular results
- [x] Status messages

Data helpers:

- [x] Install httpfs
- [x] Load Sample (people.csv)
- [x] Parquet demo (TPCH lineitem)
- [x] Reset (drops sample tables/views)

UX:

- [x] Copy SQL
- [x] Download results as CSV
- [x] Quality Report button
- [x] Snippets dropdown (Load Sample, Quality, Parquet, Aggregation, Join)
- [x] Dataset selector (people, tips, lineitem)
- [x] Persist SQL to localStorage
- [x] Share Link (URL hash)
- [x] Save as Gist (GitHub API, token with gist scope)

Planned UX:

- [ ] Import from Gist
- [ ] Shorten Share Link (Bitly or similar)
- [ ] Save/Load sessions (named presets in localStorage)

## Documentation

- [x] README overview, structure, dev, deploy
- [x] Playground usage tips
- [x] Troubleshooting (WASM)
- [x] Helpful Links
- [x] Chapter list kept up to date

Planned docs:

- [ ] CONTRIBUTING guide
- [ ] Screenshots/GIFs of playground

## Open Issues / Notes

- Remote file access requires CORS + HTTPS (documented in Troubleshooting)
- WASM worker caching and extension loading behaviors differ from native
- Consider adding basic e2e checks for playground buttons (Cypress/Playwright)

## Next Actions

1. Implement "Import from Gist" in the playground toolbar
2. Add Shorten Link integration (optional)
3. New chapter: Advanced SQL Patterns
4. Add screenshots/GIFs to README

## Testing Progress

- Coverage (2025-08-17):
  - Overall: 86.62%
  - `src/pages/Playground.tsx`: 71.47% statements, 69.91% branches
- Recent test additions:
  - Flow tests: datasets success/error, gist save success, vars persistence + interpolation, notebook move shortcuts, outside-click menu closing, CSV download stabilization
  - Integration-style SQL test (`src/lib/__tests__/sql.runner.integration.test.tsx`): `LOAD SAMPLE;` → `SELECT * FROM people LIMIT 5;` returns 5 rows via `useRunner()`
- Outstanding items:
  - Address React `act()` warnings in `Playground.test.tsx` and `Book.test.tsx`
  - Lift Playground branch coverage >73%: cover More actions (Reset DB, Install httpfs, Parquet demo) success/error, Share link error path, ResultsPanel edge cases
  - Add CSV fetch integration flavor (mock network fetch)
  - Clean up minor TS lint warnings in tests (tuple/spread)

## Timeline (high level)

- Day 1–2: Scaffold React+Vite+TS, DuckDB WASM init, base Book/Playground, initial chapters
- Day 3–4: Add extensions, troubleshooting, cheat sheet, case studies; polish styles
- Day 5: Playground UX (snippets, datasets, CSV download, quality report, persistence)
- Day 6: Sharing (Share Link, Save as Gist), documentation update, status doc
