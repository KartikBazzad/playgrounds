import { ReactNode } from 'react';
import { getChapterBySlug, getSectionBySlug } from '@/lib/bookStructure';

interface MDXLayoutProps {
  children: ReactNode;
  chapterSlug: string;
  sectionSlug: string;
}

export function MDXLayout({ children, chapterSlug, sectionSlug }: MDXLayoutProps) {
  const chapter = getChapterBySlug(chapterSlug);
  const section = getSectionBySlug(chapterSlug, sectionSlug);

  return (
    <div className="prose prose-lg max-w-none">
      <div className="mb-8">
        <nav className="text-sm text-gray-500 mb-4">
          <span>Chapter {chapter?.id}: {chapter?.title}</span>
          <span className="mx-2">›</span>
          <span>{section?.title}</span>
        </nav>
      </div>
      {children}
    </div>
  );
}
