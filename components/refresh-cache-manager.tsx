"use client"

import { useEffect } from 'react'
import { setupRefreshCacheManager } from '@/lib/utils/refresh-cache-manager'

/**
 * Client component that sets up refresh cache management
 * This ensures API caches are cleared when users refresh the page
 */
export function RefreshCacheManager() {
  useEffect(() => {
    // Set up refresh detection and cache clearing
    const cleanup = setupRefreshCacheManager()
    
    // Return cleanup function
    return cleanup
  }, [])

  // This component doesn't render anything
  return null
}
