'use client'

import { API_CONFIG } from '@/lib/config'

/**
 * Authenticated API Service
 * Handles Firebase authentication for all API calls to the 4 specified base URLs
 */
export class AuthenticatedApiService {
  private static instance: AuthenticatedApiService
  private idToken: string | null = null

  private constructor() {
    // Initialize with token from localStorage if available
    if (typeof window !== 'undefined') {
      this.idToken = localStorage.getItem('auth-token')
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthenticatedApiService {
    if (!AuthenticatedApiService.instance) {
      AuthenticatedApiService.instance = new AuthenticatedApiService()
    }
    return AuthenticatedApiService.instance
  }

  /**
   * Set the Firebase ID token for authenticated requests
   */
  setIdToken(token: string): void {
    this.idToken = token
  }

  /**
   * Get a fresh Firebase ID token (forces refresh if needed)
   */
  async refreshToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      try {
        const { auth } = await import('@/lib/firebase')
        const currentUser = auth.currentUser
        
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true) // Force refresh
          this.setIdToken(freshToken)
          localStorage.setItem('auth-token', freshToken)
          return freshToken
        }
      } catch (error) {
        console.error('Failed to refresh authentication token')
      }
    }
    return null
  }

  /**
   * Clear the stored token (on logout)
   */
  clearToken(): void {
    this.idToken = null
  }


  /**
   * Check if URL requires authentication (one of the 4 specified base URLs)
   */
  private requiresAuthentication(url: string): boolean {
    const authRequiredUrls = [
      API_CONFIG.BASE_URL,
      API_CONFIG.CANDIDATES_BASE_URL,
      API_CONFIG.CANDIDATES_DASHBOARD_BASE_URL,
      API_CONFIG.ALL_VIEWS_API_URL,
      API_CONFIG.GET_ANSWERS_API_URL
    ]

    return authRequiredUrls.some(baseUrl => baseUrl && url.startsWith(baseUrl))
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {})
    
    // Set default content type if not provided
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    // Add Firebase ID token if URL requires authentication
    if (this.requiresAuthentication(url)) {
      if (this.idToken) {
        headers.set('Authorization', `Bearer ${this.idToken}`)
      } else {
        // For development, add devpass if no token available and it's a POST request with body
        if (process.env.NODE_ENV === 'development' && options.method === 'POST' && options.body) {
          try {
            const body = typeof options.body === 'string' 
              ? JSON.parse(options.body) 
              : options.body

            if (typeof body === 'object' && body !== null) {
              (body as any).devpass = 'Sparrow123' // Using the same devpass as in sparrow-assessment.ts
              options.body = JSON.stringify(body)
            }
          } catch (error) {
            console.warn('Could not add devpass to request body:', error)
          }
        }
      }
    }

    const finalOptions: RequestInit = {
      ...options,
      headers
    }

    try {
      const response = await fetch(url, finalOptions)
      
      // If we get a 401 and this URL requires authentication, try refreshing the token once
      if (response.status === 401 && this.requiresAuthentication(url)) {
        const freshToken = await this.refreshToken()
        if (freshToken) {
          // Retry the request with fresh token
          const newHeaders = new Headers(finalOptions.headers)
          newHeaders.set('Authorization', `Bearer ${freshToken}`)
          
          const retryResponse = await fetch(url, {
            ...finalOptions,
            headers: newHeaders
          })
          
          return retryResponse
        }
      }
      
      return response
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get(url: string, options: Omit<RequestInit, 'method'> = {}): Promise<Response> {
    return this.makeRequest(url, { ...options, method: 'GET' })
  }

  /**
   * Convenience method for POST requests
   */
  async post(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<Response> {
    return this.makeRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * Convenience method for PUT requests
   */
  async put(url: string, data?: any, options: Omit<RequestInit, 'method' | 'body'> = {}): Promise<Response> {
    return this.makeRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete(url: string, options: Omit<RequestInit, 'method'> = {}): Promise<Response> {
    return this.makeRequest(url, { ...options, method: 'DELETE' })
  }
}

/**
 * Global instance for easy access
 */
export const authenticatedApiService = AuthenticatedApiService.getInstance()
