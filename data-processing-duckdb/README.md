# Data Processing with DuckDB (Beginner Book + Browser Playground)

![DuckDB](https://img.shields.io/badge/DuckDB-WASM-orange) ![Vite](https://img.shields.io/badge/Vite-React-blueviolet) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![License](https://img.shields.io/badge/License-MIT-green)

This is a beginner-friendly book with an in-browser DuckDB (WASM) SQL playground.

## Features

- React + Vite + TypeScript
- DuckDB running entirely in the browser via `@duckdb/duckdb-wasm`
- Book rendered from Markdown in `public/chapters/`
- Sample dataset in `public/data/people.csv`
- Extra chapters: Extensions (WASM), Troubleshooting, SQL Cheat Sheet, Case Studies
- Playground quick actions: Install httpfs, Load Sample, Parquet demo, Reset

## Develop

```bash
npm install
npm run dev
```
Then open the printed URL (default: <http://localhost:5173>).

## Structure

- `src/` app code
- `public/chapters/` markdown chapters
- `public/data/` sample datasets

## Playground Tips

- Click "Load Sample" to create a `people` table
- Use `INSTALL httpfs; LOAD httpfs;` to read remote files via HTTP
- Click "Parquet demo" to preview `lineitem.parquet` (remote)
- Click "Reset" to drop sample artifacts (people/adults)
- Use "Share Link" to copy a URL that embeds your SQL in the hash
- Use "Save as Gist" to create a public GitHub Gist of your SQL

## Chapters

- 01 Introduction
- 02 Getting Started (Browser & Local)
- 03 SQL Basics
- 04 Working with CSV & Parquet
- 05 Performance Tips
- 06 Ecosystem & Integrations
- 07 Playground Tutorial
- 08 Extensions in WASM
- 09 WASM Troubleshooting
- 10 SQL Cheat Sheet
- 11 Case Studies & Patterns
- 12 Data Quality with DuckDB

## Deploy

You can host the built site as static assets:

```bash
npm run build
npm run preview
```

## Troubleshooting (WASM)

- Remote files must be CORS-enabled and use HTTPS
- Some features may require `LOAD icu;`
- Keep DevTools console open for runtime errors; reload if worker init fails

## Helpful Links

- DuckDB docs: <https://duckdb.org/docs/>
- DuckDB-Wasm docs: <https://duckdb.org/docs/api/wasm/overview>
- DuckDB SQL reference: <https://duckdb.org/docs/sql/introduction>
- Vite: <https://vitejs.dev/>

## Sharing

- Share Link encodes your SQL in the URL hash (no server). Paste into the address bar to restore.
- Save as Gist uses the GitHub API. You will be prompted for a Personal Access Token with the `gist` scope. The token is only used client-side for the request.
