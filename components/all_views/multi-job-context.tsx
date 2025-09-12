"use client"

import { createContext, useContext } from "react"
import type { JobOpeningListItem } from "@/lib/job-types"

interface MultiJobContextType {
  selectedJobs: JobOpeningListItem[]
  isMultiJobMode: boolean
}

const MultiJobContext = createContext<MultiJobContextType | null>(null)

interface MultiJobProviderProps {
  children: React.ReactNode
  selectedJobs: JobOpeningListItem[]
}

export function MultiJobProvider({ children, selectedJobs }: MultiJobProviderProps) {
  return (
    <MultiJobContext.Provider value={{ 
      selectedJobs, 
      isMultiJobMode: selectedJobs.length > 1 
    }}>
      {children}
    </MultiJobContext.Provider>
  )
}

export function useMultiJobContext() {
  const context = useContext(MultiJobContext)
  if (!context) {
    throw new Error('useMultiJobContext must be used within a MultiJobProvider')
  }
  return context
}

// Hook to safely use multi-job context (returns null if not in multi-job mode)
export function useMultiJobContextSafe() {
  const context = useContext(MultiJobContext)
  return context || { selectedJobs: [], isMultiJobMode: false }
}
