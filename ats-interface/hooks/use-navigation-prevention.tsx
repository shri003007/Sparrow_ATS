"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface UseNavigationPreventionProps {
  shouldPrevent: boolean
  onNavigationAttempt: () => void
  onReloadAttempt?: () => void
}

export function useNavigationPrevention({ 
  shouldPrevent, 
  onNavigationAttempt,
  onReloadAttempt 
}: UseNavigationPreventionProps) {
  const router = useRouter()
  const preventionEnabledRef = useRef(shouldPrevent)

  // Update the ref when shouldPrevent changes
  useEffect(() => {
    preventionEnabledRef.current = shouldPrevent
  }, [shouldPrevent])

  // Prevent browser back/forward navigation and page refresh
  useEffect(() => {
    let isReloadAttempt = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (preventionEnabledRef.current) {
        // Detect common reload key combinations
        if (
          (e.ctrlKey && e.key === 'r') || // Ctrl+R
          (e.metaKey && e.key === 'r') || // Cmd+R on Mac
          (e.ctrlKey && e.shiftKey && e.key === 'r') || // Ctrl+Shift+R
          (e.metaKey && e.shiftKey && e.key === 'r') || // Cmd+Shift+R on Mac
          e.key === 'F5' // F5
        ) {
          e.preventDefault()
          isReloadAttempt = true
          if (onReloadAttempt) {
            onReloadAttempt()
          } else {
            onNavigationAttempt()
          }
        }
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (preventionEnabledRef.current) {
        // For reload attempts detected by keyboard, don't show browser dialog
        if (isReloadAttempt) {
          e.preventDefault()
          return
        }
        
        // For other cases (like closing browser tab), show browser dialog as fallback
        const message = "You have unsaved changes. If you leave, your job opening will be deleted."
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    const handlePopstate = (e: PopStateEvent) => {
      if (preventionEnabledRef.current) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.href)
        onNavigationAttempt()
      }
    }

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopstate)

    // Push initial state to enable popstate detection
    if (shouldPrevent) {
      window.history.pushState(null, "", window.location.href)
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopstate)
    }
  }, [shouldPrevent, onNavigationAttempt, onReloadAttempt])

  // Provide a method to safely navigate (bypass prevention)
  const safeNavigate = useCallback((path: string) => {
    preventionEnabledRef.current = false
    router.push(path)
  }, [router])

  // Provide a method to safely reload
  const safeReload = useCallback(() => {
    preventionEnabledRef.current = false
    window.location.reload()
  }, [])

  return {
    safeNavigate,
    safeReload
  }
}