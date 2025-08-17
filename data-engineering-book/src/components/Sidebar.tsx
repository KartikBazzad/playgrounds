'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavigationData } from '@/lib/bookStructure';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export function Sidebar() {
  const pathname = usePathname();
  const navigationData = getNavigationData();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const toggleChapter = (chapterSlug: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterSlug)) {
      newExpanded.delete(chapterSlug);
    } else {
      newExpanded.add(chapterSlug);
    }
    setExpandedChapters(newExpanded);
  };

  const isCurrentPath = (href: string) => {
    return pathname === href;
  };

  const isChapterActive = (chapterSlug: string) => {
    return pathname.includes(`/chapters/${chapterSlug}`);
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-6">
        <Link href="/" className="block">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Data Engineering
          </h1>
          <p className="text-sm text-gray-600">Complete Guide</p>
        </Link>
      </div>

      <nav className="px-4 pb-6">
        <ul className="space-y-1">
          {navigationData.map((chapter) => {
            const isExpanded = expandedChapters.has(chapter.slug);
            const isActive = isChapterActive(chapter.slug);

            return (
              <li key={chapter.id}>
                <button
                  onClick={() => toggleChapter(chapter.slug)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-md hover:bg-gray-100 transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="font-medium text-sm">
                    {chapter.id}. {chapter.title}
                  </span>
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {chapter.sections.map((section) => (
                      <li key={section.id}>
                        <Link
                          href={section.href}
                          className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                            isCurrentPath(section.href)
                              ? 'bg-blue-100 text-blue-800 font-medium'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {section.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
