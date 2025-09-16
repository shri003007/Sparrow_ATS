'use client'

import { useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { authenticatedApiService } from '@/lib/api/authenticated-api-service'

/**
 * Hook for making authenticated API calls
 * Automatically manages Firebase token with the API service
 */
export const useAuthenticatedApi = () => {
  const { user } = useAuth()

  // Update API service token when user auth state changes
  useEffect(() => {
    const updateToken = async () => {
      if (user) {
        try {
          const token = await user.getIdToken()
          authenticatedApiService.setIdToken(token)
        } catch (error) {
          console.error('Failed to get ID token:', error)
          authenticatedApiService.clearToken()
        }
      } else {
        authenticatedApiService.clearToken()
      }
    }

    updateToken()
  }, [user])

  // Generic API call wrapper with error handling
  const apiCall = useCallback(async <T>(
    apiMethod: () => Promise<Response>
  ): Promise<T> => {
    try {
      const response = await apiMethod()
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        
        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }, [])

  return {
    apiCall,
    apiService: authenticatedApiService
  }
}
