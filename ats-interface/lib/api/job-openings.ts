import { API_CONFIG } from '@/lib/config'
import type { 
  JobOpeningCreateRequest, 
  JobOpeningUpdateRequest, 
  JobOpeningApiResponse,
  JobConfirmationResponse
} from '@/lib/job-types'

export class JobOpeningsApi {
  private static baseUrl = API_CONFIG.BASE_URL

  static async createJobOpening(data: JobOpeningCreateRequest): Promise<JobOpeningApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to create job opening:', error)
      throw error
    }
  }

  static async updateJobOpening(
    jobId: string, 
    data: JobOpeningUpdateRequest
  ): Promise<JobOpeningApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to update job opening:', error)
      throw error
    }
  }

  /**
   * Confirm and publish a job opening
   */
  static async confirmJobOpening(jobOpeningId: string): Promise<JobConfirmationResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_CONFIRM}/${jobOpeningId}/confirm`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to confirm job opening: ${response.status} - ${errorData}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to confirm job opening:', error)
      throw error
    }
  }
}