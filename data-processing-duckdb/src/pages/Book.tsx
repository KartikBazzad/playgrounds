import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const chapters = [
  { id: '01-intro', title: '1. Introduction to DuckDB' },
  { id: '02-installation', title: '2. Getting Started (Browser & Local)' },
  { id: '03-sql-basics', title: '3. SQL Basics in DuckDB' },
  { id: '04-files-and-parquet', title: '4. Working with CSV & Parquet' },
  { id: '05-performance', title: '5. Performance Tips' },
  { id: '06-ecosystem', title: '6. Ecosystem & Integrations' },
  { id: '07-playground-tutorial', title: '7. Playground Tutorial' },
  { id: '08-extensions', title: '8. Extensions in WASM' },
  { id: '09-wasm-troubleshooting', title: '9. WASM Troubleshooting' },
  { id: '10-cheatsheet', title: '10. SQL Cheat Sheet' },
  { id: '11-case-studies', title: '11. Case Studies & Patterns' },
  { id: '12-data-quality', title: '12. Data Quality with DuckDB' },
];

export default function Book() {
  const [active, setActive] = useState(chapters[0].id);
  const [content, setContent] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/chapters/${active}.md`);
      const text = await res.text();
      setContent(text);
    })();
  }, [active]);

  return (
    <div className="book-grid">
      <style>{`
        .book-grid{display:grid;grid-template-columns:260px 1fr;gap:16px}
        .chapterlist{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:12px;height:calc(100vh - 80px);overflow:auto}
        .chapterlist button{width:100%;text-align:left;background:transparent;border:1px solid transparent;color:var(--text);padding:8px 10px;border-radius:8px}
        .chapterlist button.active,.chapterlist button:hover{background:#0b1220;border-color:var(--border)}
      `}</style>
      <aside className="chapterlist">
        {chapters.map((c) => (
          <div key={c.id}>
            <button className={active === c.id ? 'active' : ''} onClick={() => setActive(c.id)}>
              {c.title}
            </button>
          </div>
        ))}
      </aside>
      <article className="card">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
