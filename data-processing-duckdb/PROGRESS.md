# DuckDB Playground Testing Progress

## Current Status (2025-08-17)
- Overall coverage: 86.62%
- `src/pages/Playground.tsx`: 71.47% statements, 69.91% branches
- New integration-style test added: `src/lib/__tests__/sql.runner.integration.test.tsx`
  - Initializes mocked DuckDB in tests via `useRunner()`
  - Verifies `LOAD SAMPLE;` then `SELECT * FROM people LIMIT 5;` returns 5 rows

## Recent Changes
- Stabilized CSV download test (wait for enabled state)
- Added flow tests covering:
  - Datasets loading (success for People/Tips/TPCH Lineitem, error path via `refreshSchema`)
  - Gist save success path (prompt + fetch + clipboard)
  - Vars panel persistence + interpolation
  - Notebook keyboard shortcuts (Alt+ArrowUp/Down)
  - Outside-click closing menus
- Fixed dataset menu label mismatch (TPCH Lineitem)

## Open Items
- React `act()` warnings in `Playground.test.tsx` and `Book.test.tsx` (non-failing)
- Minor TypeScript lint warnings in tests (tuple/spread)

## Next Steps
1. Playground branch coverage >73%
   - Cover More actions (Reset DB, Install httpfs, Parquet demo) success/error
   - Share link error path
   - ResultsPanel edge cases
2. Reduce test warnings
   - Wrap async state updates with `act()` where needed
3. Add CSV fetch integration flavor
   - Mock network fetch inside the DuckDB path for closer-to-real behavior
4. Lint/Types tidy-up in tests

## Useful Commands
- Run full suite with coverage:
  ```sh
  npm run test:coverage -s
  ```
- Run the new integration test only:
  ```sh
  npm test -s src/lib/__tests__/sql.runner.integration.test.tsx
  ```
