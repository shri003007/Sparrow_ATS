"use client"

import { Clock, ChevronDown } from "lucide-react"

interface StatusTagProps {
  status: string
  onClick?: () => void
}

export function StatusTag({ status, onClick }: StatusTagProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 transition-colors"
      style={{
        borderColor: "#E5E7EB",
        fontSize: "14px",
        fontFamily,
      }}
    >
      <Clock className="w-3 h-3" style={{ color: "#9CA3AF" }} />
      <span style={{ color: "#6B7280" }}>{status}</span>
      <ChevronDown className="w-3 h-3" style={{ color: "#9CA3AF" }} />
    </button>
  )
}
