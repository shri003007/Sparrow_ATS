import { API_CONFIG } from '@/lib/config'
import type { JobTemplatesApiResponse } from '@/lib/job-types'
import { authenticatedApiService } from './authenticated-api-service'

export class JobTemplatesApi {
  private static baseUrl = API_CONFIG.BASE_URL

  static async getJobTemplates(): Promise<JobTemplatesApiResponse> {
    try {
      const response = await authenticatedApiService.get(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_TEMPLATES}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch job templates:', error)
      throw error
    }
  }
}