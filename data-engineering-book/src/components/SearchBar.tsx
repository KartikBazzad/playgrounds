'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getNavigationData } from '@/lib/bookStructure';
import Link from 'next/link';

interface SearchResult {
  title: string;
  href: string;
  chapter: string;
  type: 'chapter' | 'section';
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const navigationData = getNavigationData();
    const searchResults: SearchResult[] = [];

    navigationData.forEach((chapter) => {
      // Search in chapter titles
      if (chapter.title.toLowerCase().includes(query.toLowerCase())) {
        searchResults.push({
          title: chapter.title,
          href: `/chapters/${chapter.slug}`,
          chapter: chapter.title,
          type: 'chapter'
        });
      }

      // Search in section titles
      chapter.sections.forEach((section) => {
        if (section.title.toLowerCase().includes(query.toLowerCase())) {
          searchResults.push({
            title: section.title,
            href: section.href,
            chapter: chapter.title,
            type: 'section'
          });
        }
      });
    });

    setResults(searchResults.slice(0, 10)); // Limit to 10 results
    setIsOpen(searchResults.length > 0);
  }, [query]);

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search the book..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <Link
              key={index}
              href={result.href}
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{result.title}</div>
              <div className="text-sm text-gray-500">
                in {result.chapter} • {result.type}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
