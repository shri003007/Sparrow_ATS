import { API_CONFIG } from '@/lib/config'
import type { JobTemplatesApiResponse } from '@/lib/job-types'

export class JobTemplatesApi {
  private static baseUrl = API_CONFIG.BASE_URL

  static async getJobTemplates(): Promise<JobTemplatesApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_TEMPLATES}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

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