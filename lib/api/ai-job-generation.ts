import { API_CONFIG } from '@/lib/config'
import type { AIJobGenerationRequest, AIJobGenerationResponse } from '@/lib/job-types'
import { authenticatedApiService } from './authenticated-api-service'

export class AIJobGenerationApi {
  /**
   * Generate job description using AI
   * Returns both success and structured error responses
   */
  static async generateJobDescription(request: AIJobGenerationRequest): Promise<AIJobGenerationResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AI_GENERATE_JOB}`
    
    const response = await authenticatedApiService.post(url, request)

    // For 400 errors (validation failures), the API returns structured error responses
    // that we should return rather than throw
    if (response.status === 400) {
      return response.json() // This will be the structured error response
    }

    // For other HTTP errors (500, network issues, etc.), throw an error
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Failed to generate job description: ${response.status} - ${errorData}`)
    }

    return response.json()
  }
}