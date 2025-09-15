/**
 * Utility to manage cache clearing on page refresh
 * This ensures fresh API calls are made when users refresh the page
 */

const REFRESH_DETECTION_KEY = 'ats_page_refresh_detection'
const NAVIGATION_TYPE_KEY = 'ats_navigation_type'

/**
 * Detects if the current page load was due to a refresh
 * Uses performance.navigation.type and sessionStorage to track navigation
 */
export function isPageRefresh(): boolean {
  try {
    // Method 1: Use Performance Navigation API (modern browsers)
    if ('performance' in window && 'navigation' in performance) {
      const perfNavigation = (performance as any).navigation
      if (perfNavigation && perfNavigation.type === 1) { // TYPE_RELOAD = 1
        return true
      }
    }

    // Method 2: Use performance.getEntriesByType (more reliable)
    if ('performance' in window && performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0]
        if (navEntry.type === 'reload') {
          return true
        }
      }
    }

    // Method 3: Fallback using sessionStorage
    const wasRefresh = sessionStorage.getItem(REFRESH_DETECTION_KEY)
    if (wasRefresh === 'true') {
      sessionStorage.removeItem(REFRESH_DETECTION_KEY)
      return true
    }

    return false
  } catch (error) {
    console.warn('Failed to detect page refresh:', error)
    return false
  }
}

/**
 * Marks the current navigation as a refresh for detection
 * This should be called before the page unloads
 */
export function markAsRefresh(): void {
  try {
    sessionStorage.setItem(REFRESH_DETECTION_KEY, 'true')
  } catch (error) {
    console.warn('Failed to mark page refresh:', error)
  }
}

/**
 * Clears all API caches used in the application
 */
export async function clearAllApiCaches(): Promise<void> {
  try {
    console.log('Clearing all API caches due to page refresh...')
    
    // Clear localStorage caches
    const keysToRemove = [
      'ats_round_candidates_cache',
      'ats_round_candidates_cache_expiry',
      'ats_job_round_templates_cache',
      'ats_job_round_templates_cache_expiry',
      'ats_sparrow_assessment_mapping_cache',
      'ats_sparrow_assessment_mapping_cache_expiry'
    ]

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`Failed to remove cache key ${key}:`, error)
      }
    })

    // Also clear API class caches using their methods
    try {
      const [
        { RoundCandidatesApi },
        { JobRoundTemplatesApi },
        { clearSparrowAssessmentMappingCache }
      ] = await Promise.all([
        import('@/lib/api/round-candidates'),
        import('@/lib/api/rounds'),
        import('@/lib/api/sparrow-assessment-mapping')
      ])

      RoundCandidatesApi.clearCache()
      JobRoundTemplatesApi.clearCache()
      clearSparrowAssessmentMappingCache()
      
      console.log('Successfully cleared all API caches')
    } catch (error) {
      console.warn('Failed to clear some API caches:', error)
    }
  } catch (error) {
    console.error('Failed to clear API caches:', error)
  }
}

/**
 * Sets up refresh detection and cache clearing
 * Should be called once when the app initializes
 */
export function setupRefreshCacheManager(): void {
  try {
    // Check if this was a page refresh
    if (isPageRefresh()) {
      console.log('Page refresh detected, clearing caches...')
      clearAllApiCaches()
    }

    // Set up beforeunload listener to detect refresh attempts
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check if this might be a refresh (not a navigation away)
      // We can't be 100% sure, but we can make educated guesses
      const isLikelyRefresh = 
        event.type === 'beforeunload' && 
        !document.hidden && // Page is still visible
        window.location.href === document.URL // URL hasn't changed

      if (isLikelyRefresh) {
        markAsRefresh()
      }
    }

    // Set up keyboard listener for refresh shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      const isRefreshShortcut = 
        (event.ctrlKey && event.key === 'r') || // Ctrl+R
        (event.metaKey && event.key === 'r') || // Cmd+R on Mac
        (event.ctrlKey && event.shiftKey && event.key === 'r') || // Ctrl+Shift+R
        (event.metaKey && event.shiftKey && event.key === 'r') || // Cmd+Shift+R on Mac
        event.key === 'F5' // F5

      if (isRefreshShortcut) {
        markAsRefresh()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup function (though this won't be called on refresh)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
    }
  } catch (error) {
    console.error('Failed to setup refresh cache manager:', error)
  }
}

/**
 * Force clear all caches (useful for debugging or manual cache clearing)
 */
export function forceClearAllCaches(): Promise<void> {
  console.log('Force clearing all API caches...')
  return clearAllApiCaches()
}

/**
 * Debug utility to check cache status
 */
export function debugCacheStatus(): void {
  try {
    const cacheKeys = [
      'ats_round_candidates_cache',
      'ats_round_candidates_cache_expiry',
      'ats_job_round_templates_cache',
      'ats_job_round_templates_cache_expiry',
      'ats_sparrow_assessment_mapping_cache',
      'ats_sparrow_assessment_mapping_cache_expiry'
    ]

    console.log('=== Cache Status Debug ===')
    cacheKeys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        if (key.includes('expiry')) {
          const expiryTime = parseInt(value)
          const now = Date.now()
          const isExpired = now > expiryTime
          const timeLeft = isExpired ? 0 : Math.round((expiryTime - now) / 1000 / 60) // minutes
          console.log(`${key}: ${isExpired ? 'EXPIRED' : `${timeLeft} minutes left`}`)
        } else {
          const data = JSON.parse(value)
          const keys = Object.keys(data)
          console.log(`${key}: ${keys.length} cached items`)
        }
      } else {
        console.log(`${key}: NOT CACHED`)
      }
    })
    console.log('=== End Cache Status ===')
  } catch (error) {
    console.error('Failed to debug cache status:', error)
  }
}

/**
 * Debug utility to check round persistence status
 */
export function debugRoundPersistence(): void {
  try {
    console.log('=== Round Persistence Debug ===')
    const keys = [
      'ats_selected_job',
      'ats_current_view', 
      'ats_current_round_index'
    ]
    
    keys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        if (key === 'ats_selected_job') {
          try {
            const job = JSON.parse(value)
            console.log(`${key}: Job "${job.posting_title}" (ID: ${job.id})`)
          } catch {
            console.log(`${key}: ${value}`)
          }
        } else {
          console.log(`${key}: ${value}`)
        }
      } else {
        console.log(`${key}: NOT SET`)
      }
    })
    console.log('=== End Round Persistence ===')
  } catch (error) {
    console.error('Failed to debug round persistence:', error)
  }
}

// Make debug functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).debugCacheStatus = debugCacheStatus;
  (window as any).forceClearAllCaches = forceClearAllCaches;
  (window as any).debugRoundPersistence = debugRoundPersistence;
}
