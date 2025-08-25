"use client"

import React from 'react'
import { MessageSquare } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

interface QAPairsProps {
  qaPairs: string
}

export function QAPairsSection({ qaPairs }: QAPairsProps) {
  if (!qaPairs) return null

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
