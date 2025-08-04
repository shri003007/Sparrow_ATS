import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          // Custom paragraph styles
          p: ({ children }) => (
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              {children}
            </p>
          ),
          // Custom list styles
          ul: ({ children }) => (
            <ul className="list-none space-y-2 mb-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4">
              {children}
            </ol>
          ),
          li: ({ children, ordered }) => {
            if (ordered) {
              return (
                <li className="text-sm text-gray-700 leading-relaxed">
                  {children}
                </li>
              );
            }
            return (
              <li className="flex items-start text-sm text-gray-700 leading-relaxed">
                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>{children}</span>
              </li>
            );
          },
          // Custom strong and emphasis styles
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800">
              {children}
            </em>
          ),
          // Custom code styles
          code: ({ children, inline }) => {
            if (inline) {
              return (
                <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          // Custom blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 mb-4">
              {children}
            </blockquote>
          ),
          // Custom table styles
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
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
              {children}
            </td>
          ),
          // Custom horizontal rule
          hr: () => (
            <hr className="border-gray-200 my-6" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 