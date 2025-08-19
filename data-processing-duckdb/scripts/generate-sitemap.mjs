#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicDir = path.join(root, 'public');
const outFile = path.join(publicDir, 'sitemap.xml');

const BASE = process.env.SITE_BASE || 'http://localhost:5173';

// Known app routes from src/App.tsx
const routes = ['/', '/playground', '/web-shell'];

const now = new Date().toISOString();
const urls = routes
  .map((p) => `  <url>\n    <loc>${BASE.replace(/\/$/, '')}${p}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`) // prettier-ignore
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
`${urls}\n` +
`</urlset>\n`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(outFile, xml, 'utf8');
console.log(`Wrote sitemap: ${outFile}`);
