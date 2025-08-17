# Introduction to DuckDB

DuckDB is an in-process analytical SQL database. Think of it as "SQLite for analytics":

- Embeds directly in your app (no server to manage)
- Columnar execution and vectorized engine
- Excellent Parquet/CSV support
- Great for data analysis, prototyping, testing, and embedding in apps

What you can do:
- Query local files (CSV/Parquet/JSON)
- Query remote files over HTTP using `httpfs`
- Join multiple datasets and run analytics fast
- Use it from Python, R, Node, or directly in the browser via WebAssembly (WASM)

In this book, you'll learn DuckDB concepts by reading chapters and experimenting in the built-in browser playground.
