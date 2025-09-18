import { API_CONFIG } from '@/lib/config'
import type { 
  JobOpeningCreateRequest, 
  JobOpeningUpdateRequest, 
  JobOpeningApiResponse,
  JobConfirmationResponse,
  JobOpeningsListResponse
} from '@/lib/job-types'
import { authenticatedApiService } from './authenticated-api-service'

export class JobOpeningsApi {
  private static baseUrl = API_CONFIG.BASE_URL

  /**
   * Get all job openings (admin access)
   */
  static async getAllJobOpenings(): Promise<JobOpeningsListResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch job openings: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching job openings:', error)
      throw error
    }
  }

  /**
   * Get job openings accessible by a specific user
   */
  static async getJobOpenings(userId: string): Promise<JobOpeningsListResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}/user/${userId}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch job openings: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching job openings:', error)
      throw error
    }
  }

  static async createJobOpening(data: JobOpeningCreateRequest): Promise<JobOpeningApiResponse> {
    try {
      const response = await authenticatedApiService.post(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}`, data)

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
      const response = await authenticatedApiService.put(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}/${jobId}`, data)

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
      
      const response = await authenticatedApiService.post(url)

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

  /**
   * Delete a job opening and all related data
   */
  static async deleteJobOpening(jobOpeningId: string): Promise<{ message: string }> {
    try {
      const response = await authenticatedApiService.delete(`${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_OPENINGS}/${jobOpeningId}`)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to delete job opening: ${response.status} - ${errorData}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to delete job opening:', error)
      throw error
    }
  }
}