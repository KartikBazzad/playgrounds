import Link from "next/link";
import { getAllChapters } from "@/lib/bookStructure";

export default function Home() {
  const chapters = getAllChapters();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Data Engineering
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A Complete Guide to Modern Data Engineering
        </p>
        <p className="text-lg text-gray-500 max-w-3xl mx-auto">
          Master the fundamentals and advanced concepts of data engineering with practical examples, 
          code snippets, and real-world case studies. From data architecture to stream processing, 
          this comprehensive guide covers everything you need to know.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-xl font-semibold text-blue-900 mb-3">
            📚 10 Comprehensive Chapters
          </h3>
          <p className="text-blue-700">
            From fundamentals to advanced topics, covering the complete data engineering landscape.
          </p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-xl font-semibold text-green-900 mb-3">
            💻 Code Examples
          </h3>
          <p className="text-green-700">
            Practical code snippets and examples in Python, SQL, and popular data tools.
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-xl font-semibold text-purple-900 mb-3">
            📊 Visual Diagrams
          </h3>
          <p className="text-purple-700">
            Mermaid diagrams and UML charts to visualize complex data architectures.
          </p>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <h3 className="text-xl font-semibold text-orange-900 mb-3">
            🔍 Searchable Content
          </h3>
          <p className="text-orange-700">
            Quickly find topics and concepts with our built-in search functionality.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Table of Contents</h2>
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Chapter {chapter.id}: {chapter.title}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    {chapter.sections.map((section) => (
                      <Link
                        key={section.id}
                        href={`/chapters/${chapter.slug}/${section.slug}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                      >
                        • {section.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center bg-gray-50 p-8 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Learning?</h3>
        <p className="text-gray-600 mb-6">
          Begin your data engineering journey with our comprehensive guide.
        </p>
        <Link
          href="/chapters/introduction/what-is-data-engineering"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Reading →
        </Link>
      </div>
    </div>
  );
}
