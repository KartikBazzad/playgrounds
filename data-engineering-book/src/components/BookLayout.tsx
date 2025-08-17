'use client';

import { Sidebar } from './Sidebar';
import { SearchBar } from './SearchBar';

interface BookLayoutProps {
  children: React.ReactNode;
}

export function BookLayout({ children }: BookLayoutProps) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-md">
            <SearchBar />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
