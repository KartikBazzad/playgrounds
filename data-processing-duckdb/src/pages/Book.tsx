import { useEffect, useState } from 'react';
import { useSEO } from '@/lib/useSEO';
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

  const activeChapter = chapters.find((c) => c.id === active) || chapters[0];
  useSEO({
    title: `${activeChapter.title} – DuckDB Book`,
    description: `${activeChapter.title}: Learn DuckDB with hands-on examples in the browser.`,
    image: '/og-image.png',
    siteName: 'DuckDB Data Processing',
  });

  useEffect(() => {
    (async () => {
      const res = await fetch(`/chapters/${active}.md`);
      const text = await res.text();
      setContent(text);
    })();
  }, [active]);

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4">
      <aside className="card h-[calc(100vh-80px)] bg-base-100 border border-base-300 overflow-auto">
        <ul className=" h-full">
          {chapters.map((c) => (
            <li key={c.id}>
              <a className={`${active === c.id ? 'active' : ''} link`} onClick={() => setActive(c.id)}>
                {c.title}
              </a>
            </li>
          ))}
        </ul>
      </aside>
      <article className="card bg-base-100 border border-base-300 p-3 h-[calc(100vh-80px)] overflow-auto">
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
