"use client"

import React from 'react'
import { MessageSquare } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

interface QAPair {
  question: string
  answer: string
  question_number: number
}

interface QAPairsProps {
  qaPairs: string | QAPair[]
}

export function QAPairsSection({ qaPairs }: QAPairsProps) {
  if (!qaPairs) return null

  // Handle string format (interview rounds)
  if (typeof qaPairs === 'string') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5" style={{ color: '#5BA4A4' }} />
              <h3 className="text-lg font-bold text-gray-900">Interview Q&A Session</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer 
                content={qaPairs.replace(/\\n/g, '\n')}
                className="prose prose-sm max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle array format (sales rounds)
  if (Array.isArray(qaPairs)) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5" style={{ color: '#5BA4A4' }} />
              <h3 className="text-lg font-bold text-gray-900">Q&A Session</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {qaPairs.map((qaPair, index) => (
              <div key={index} className="border-l-4 border-blue-200 pl-4">
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Question {qaPair.question_number}
                  </h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {qaPair.question}
                  </p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Answer:</h5>
                  <div className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                    {qaPair.answer === "Not answered" ? (
                      <span className="italic text-gray-500">Not answered</span>
                    ) : (
                      <p className="whitespace-pre-wrap">{qaPair.answer}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
