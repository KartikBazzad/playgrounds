import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Book from './pages/Book';
import Playground from './pages/Playground';
import './styles.css';

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="brand">DuckDB for Beginners</h1>
        <nav>
          <ul>
            <li>
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>📘 Book</NavLink>
            </li>
            <li>
              <NavLink to="/playground" className={({ isActive }) => isActive ? 'active' : ''}>🧪 Playground</NavLink>
            </li>
            <li className="spacer" />
            <li>
              <a href="https://duckdb.org/" target="_blank" rel="noreferrer">DuckDB Docs ↗</a>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Book />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="*" element={<div>Not Found. Go <Link to="/">home</Link>.</div>} />
        </Routes>
      </main>
    </div>
  );
}
