import { API_CONFIG } from '@/lib/config'
import type { JobOpeningListItem } from '@/lib/job-types'

export interface AllView {
  id: string
  title: string
  created_by: string
  created_at: string
  job_opening_ids: string[]
}

export interface AllViewWithJobs extends AllView {
  job_openings: JobOpeningListItem[]
}

export interface AllViewsListResponse {
  all_views: AllView[]
  total_count: number
}

export interface CreateAllViewRequest {
  title: string
  job_opening_ids: string[]
  created_by: string
}

export interface AllViewApiResponse {
  success: boolean
  data: AllView
  message?: string
}

export interface DeleteAllViewResponse {
  success: boolean
  message: string
}

export class AllViewsApi {
  private static baseUrl = API_CONFIG.ALL_VIEWS_API_URL

  /**
   * Get all views for a specific user (or all views if user is admin)
   */
  static async getAllViewsForUser(userId: string): Promise<AllViewsListResponse> {
    try {
      if (!this.baseUrl) {
        throw new Error('All Views API URL not configured. Please set NEXT_PUBLIC_ALL_VIEWS_API_URL in your environment variables.')
      }

      const url = `${this.baseUrl}/all-views/user/${userId}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch all views: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching all views:', error)
      throw error
    }
  }

  /**
   * Get all views in the system (admin only)
   */
  static async getAllViews(): Promise<AllViewsListResponse> {
    try {
      if (!this.baseUrl) {
        throw new Error('All Views API URL not configured. Please set NEXT_PUBLIC_ALL_VIEWS_API_URL in your environment variables.')
      }

      const url = `${this.baseUrl}/all-views`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch all views: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching all views:', error)
      throw error
    }
  }

  /**
   * Create a new all view
   */
  static async createAllView(data: CreateAllViewRequest): Promise<AllViewApiResponse> {
    try {
      if (!this.baseUrl) {
        throw new Error('All Views API URL not configured. Please set NEXT_PUBLIC_ALL_VIEWS_API_URL in your environment variables.')
      }

      const response = await fetch(`${this.baseUrl}/all-views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to create all view: ${response.status} - ${errorData}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to create all view:', error)
      throw error
    }
  }

  /**
   * Helper function to get jobs for view IDs
   * This fetches job details for the job_opening_ids in a view
   */
  static async getJobsForView(jobIds: string[], userId: string): Promise<JobOpeningListItem[]> {
    try {
      // Import here to avoid circular dependencies
      const { JobOpeningsApi } = await import('./job-openings')
      
      // Get all user's accessible jobs
      const response = await JobOpeningsApi.getJobOpenings(userId)
      
      // Filter to only include jobs that are in the view
      const viewJobs = response.job_openings.filter(job => 
        jobIds.includes(job.id)
      )
      
      return viewJobs
    } catch (error) {
      console.error('Failed to fetch jobs for view:', error)
      throw error
    }
  }
}
