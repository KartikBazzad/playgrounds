import type { MDXComponents } from 'mdx/types'

// Simple text-based diagram component as fallback
function SimpleDiagram({ chart }: { chart: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 my-6">
      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
        {chart}
      </pre>
    </div>
  )
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold text-gray-800 mb-4 mt-8">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-medium text-gray-700 mb-3 mt-6">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-600 mb-4 leading-relaxed">
        {children}
      </p>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 text-gray-600 space-y-2">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 text-gray-600 space-y-2">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-4">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-gray-200 rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-50">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold text-gray-900 border-b border-gray-200">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 text-gray-600 border-b border-gray-100">
        {children}
      </td>
    ),
    MermaidDiagram: SimpleDiagram,
    ...components,
  }
}
