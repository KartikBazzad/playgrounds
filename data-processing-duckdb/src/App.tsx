import { Link, NavLink, Route, Routes } from 'react-router-dom';
import Book from './pages/Book';
import Playground from './pages/Playground';
import WebShell from './pages/WebShell';
import './styles.css';

export default function App() {
  return (
    <div className="h-svh w-svw flex flex-col bg-base-200">
      <header className="navbar sticky top-0 z-50 bg-base-100 border-b border-base-300">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-sm font-bold">DuckDB for Beginners</Link>
        </div>
        <nav className="flex-none">
          <ul className=" flex flex-row gap-3 px-1">
            <li>
              <NavLink to="/" end className={({ isActive }) => `${isActive ? 'active' : ''} link link-hover`}>
                
                <span>Book</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/playground" className={({ isActive }) => `${isActive ? 'active' : ''} link link-hover`}>
                
                <span>Playground</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/web-shell" className={({ isActive }) => `${isActive ? 'active' : ''} link link-hover`}>
               
                <span>Web Shell</span>
              </NavLink>
            </li>
            <li>
              <a href="https://duckdb.org/" target="_blank" rel="noreferrer" className="link link-hover">
                <span className='material-symbols-outlined' aria-hidden>open_in_new</span>
                <span>DuckDB Docs</span>
              </a>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden flex w-svw">
        <Routes>
          <Route path="/" element={<Book />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/web-shell" element={<WebShell />} />
          <Route path="*" element={<div>Not Found. Go <Link to="/">home</Link>.</div>} />
        </Routes>
      </main>
    </div>
  );
}
