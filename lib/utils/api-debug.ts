/**
 * API Debug Utilities
 * Helper functions to analyze and debug API call patterns
 */

interface ApiCallSummary {
  totalCalls: number
  cacheHits: number
  apiRequests: number
  errors: number
  aborted: number
  averageResponseTime: number
  callsByType: Record<string, number>
}

class ApiDebugger {
  private static instance: ApiDebugger
  private calls: Array<{
    id: string
    type: string
    timestamp: number
    status: 'cache' | 'request' | 'success' | 'error' | 'aborted'
    responseTime?: number
    details?: any
  }> = []

  static getInstance(): ApiDebugger {
    if (!ApiDebugger.instance) {
      ApiDebugger.instance = new ApiDebugger()
    }
    return ApiDebugger.instance
  }

  logCall(id: string, type: string, status: 'cache' | 'request' | 'success' | 'error' | 'aborted', responseTime?: number, details?: any) {
    this.calls.push({
      id,
      type,
      timestamp: Date.now(),
      status,
      responseTime,
      details
    })

    // Keep only last 100 calls to prevent memory issues
    if (this.calls.length > 100) {
      this.calls = this.calls.slice(-100)
    }
  }

  getSummary(timeWindowMs: number = 30000): ApiCallSummary {
    const now = Date.now()
    const recentCalls = this.calls.filter(call => now - call.timestamp <= timeWindowMs)

    const summary: ApiCallSummary = {
      totalCalls: recentCalls.length,
      cacheHits: recentCalls.filter(c => c.status === 'cache').length,
      apiRequests: recentCalls.filter(c => c.status === 'request' || c.status === 'success').length,
      errors: recentCalls.filter(c => c.status === 'error').length,
      aborted: recentCalls.filter(c => c.status === 'aborted').length,
      averageResponseTime: 0,
      callsByType: {}
    }

    // Calculate average response time
    const successfulCalls = recentCalls.filter(c => c.status === 'success' && c.responseTime)
    if (successfulCalls.length > 0) {
      summary.averageResponseTime = successfulCalls.reduce((sum, call) => sum + (call.responseTime || 0), 0) / successfulCalls.length
    }

    // Count calls by type
    recentCalls.forEach(call => {
      summary.callsByType[call.type] = (summary.callsByType[call.type] || 0) + 1
    })

    return summary
  }

  printSummary(timeWindowMs: number = 30000) {
    const summary = this.getSummary(timeWindowMs)
    
    console.group(`📊 API Call Summary (Last ${timeWindowMs / 1000}s)`)
    console.log(`Total Calls: ${summary.totalCalls}`)
    console.log(`Cache Hits: ${summary.cacheHits} (${Math.round(summary.cacheHits / summary.totalCalls * 100)}%)`)
    console.log(`API Requests: ${summary.apiRequests}`)
    console.log(`Errors: ${summary.errors}`)
    console.log(`Aborted: ${summary.aborted}`)
    console.log(`Average Response Time: ${Math.round(summary.averageResponseTime)}ms`)
    
    console.group('Calls by Type:')
    Object.entries(summary.callsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    console.groupEnd()
    
    console.groupEnd()
  }

  printRecentCalls(count: number = 20) {
    const recentCalls = this.calls.slice(-count)
    
    console.group(`📋 Recent API Calls (Last ${count})`)
    recentCalls.forEach(call => {
      const statusEmoji = {
        cache: '🟢',
        request: '🔴',
        success: '✅',
        error: '❌',
        aborted: '🟠'
      }[call.status] || '⚪'
      
      const timeAgo = Math.round((Date.now() - call.timestamp) / 1000)
      const responseTime = call.responseTime ? ` (${Math.round(call.responseTime)}ms)` : ''
      
      console.log(`${statusEmoji} [${call.type}] ${call.id}${responseTime} - ${timeAgo}s ago`)
    })
    console.groupEnd()
  }

  detectDuplicates(timeWindowMs: number = 5000): Array<{ type: string, ids: string[], count: number }> {
    const now = Date.now()
    const recentCalls = this.calls.filter(call => now - call.timestamp <= timeWindowMs)
    
    const callGroups: Record<string, string[]> = {}
    
    recentCalls.forEach(call => {
      const key = `${call.type}-${call.details?.jobId || call.details?.templateId || 'unknown'}`
      if (!callGroups[key]) {
        callGroups[key] = []
      }
      callGroups[key].push(call.id)
    })
    
    return Object.entries(callGroups)
      .filter(([_, ids]) => ids.length > 1)
      .map(([type, ids]) => ({ type, ids, count: ids.length }))
  }

  printDuplicates(timeWindowMs: number = 5000) {
    const duplicates = this.detectDuplicates(timeWindowMs)
    
    if (duplicates.length === 0) {
      console.log(`✅ No duplicate API calls detected in the last ${timeWindowMs / 1000}s`)
      return
    }
    
    console.group(`⚠️ Duplicate API Calls Detected (Last ${timeWindowMs / 1000}s)`)
    duplicates.forEach(({ type, ids, count }) => {
      console.log(`${type}: ${count} calls`)
      console.log(`  IDs: ${ids.join(', ')}`)
    })
    console.groupEnd()
  }

  clear() {
    this.calls = []
    console.log('🧹 API debug log cleared')
  }
}

// Global instance
export const apiDebugger = ApiDebugger.getInstance()

// Convenience functions for console access
declare global {
  interface Window {
    apiDebug: {
      summary: () => void
      recent: (count?: number) => void
      duplicates: () => void
      clear: () => void
    }
  }
}

// Make debugging functions available in browser console
if (typeof window !== 'undefined') {
  window.apiDebug = {
    summary: () => apiDebugger.printSummary(),
    recent: (count = 20) => apiDebugger.printRecentCalls(count),
    duplicates: () => apiDebugger.printDuplicates(),
    clear: () => apiDebugger.clear()
  }
}
