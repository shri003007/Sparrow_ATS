import { API_CONFIG } from '@/lib/config'
import { authenticatedApiService } from './authenticated-api-service'

export interface UserJobAccess {
  id: string
  user_id: string
  job_opening_id: string
  access_type: 'read' | 'write' | 'admin'
  user_name?: string
  user_email?: string
  job_title?: string
  created_at?: string
  updated_at?: string
}

export interface CreateUserJobAccessRequest {
  user_id: string
  job_opening_id: string
  access_type: 'read' | 'write' | 'admin'
}

export interface CreateUserJobAccessResponse {
  message: string
  access: UserJobAccess
}

export interface GetUserJobAccessResponse {
  user_job_access: UserJobAccess[]
}

export interface GetUserJobAccessDetailsResponse {
  access: UserJobAccess
}

export interface UpdateUserJobAccessRequest {
  access_type?: 'read' | 'write' | 'admin'
}

export interface UpdateUserJobAccessResponse {
  message: string
  access: UserJobAccess
}

export interface DeleteUserJobAccessResponse {
  message: string
}

export interface BulkJobAccessItem {
  job_opening_id: string
  access_type: 'read' | 'write' | 'admin'
}

export interface CreateBulkUserJobAccessRequest {
  job_access_items: BulkJobAccessItem[]
  overwrite_existing?: boolean
}

export interface CreateBulkUserJobAccessResponse {
  message: string
  created_count: number
  updated_count: number
  access_records: UserJobAccess[]
}

export interface GetUserJobOpeningsResponse {
  job_openings: any[] // Using any for now, can be typed more specifically later
}

export class UserJobAccessApi {
  private static baseUrl = API_CONFIG.BASE_URL

  /**
   * Create a new user job opening access record
   */
  static async createUserJobAccess(accessData: CreateUserJobAccessRequest): Promise<CreateUserJobAccessResponse> {
    try {
      const url = `${this.baseUrl}/user-job-access`
      const response = await authenticatedApiService.post(url, accessData)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to create user job access: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating user job access:', error)
      throw error
    }
  }

  /**
   * Get all user job opening access records with optional filtering
   */
  static async getUserJobAccess(params?: {
    user_id?: string
    job_opening_id?: string
    access_type?: string
  }): Promise<GetUserJobAccessResponse> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.user_id) searchParams.append('user_id', params.user_id)
      if (params?.job_opening_id) searchParams.append('job_opening_id', params.job_opening_id)
      if (params?.access_type) searchParams.append('access_type', params.access_type)

      const url = `${this.baseUrl}/user-job-access${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch user job access: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user job access:', error)
      throw error
    }
  }

  /**
   * Get a specific user job opening access record by ID
   */
  static async getUserJobAccessById(accessId: string): Promise<GetUserJobAccessDetailsResponse> {
    try {
      const url = `${this.baseUrl}/user-job-access/${accessId}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch user job access details: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user job access by ID:', error)
      throw error
    }
  }

  /**
   * Update an existing user job opening access record
   */
  static async updateUserJobAccess(accessId: string, accessData: UpdateUserJobAccessRequest): Promise<UpdateUserJobAccessResponse> {
    try {
      const url = `${this.baseUrl}/user-job-access/${accessId}`
      const response = await authenticatedApiService.put(url, accessData)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to update user job access: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating user job access:', error)
      throw error
    }
  }

  /**
   * Delete a user job opening access record
   */
  static async deleteUserJobAccess(accessId: string): Promise<DeleteUserJobAccessResponse> {
    try {
      const url = `${this.baseUrl}/user-job-access/${accessId}`
      const response = await authenticatedApiService.delete(url)

      if (!response.ok) {
        throw new Error(`Failed to delete user job access: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting user job access:', error)
      throw error
    }
  }

  /**
   * Create multiple job opening access records for a single user in bulk
   */
  static async createBulkUserJobAccess(userId: string, accessData: CreateBulkUserJobAccessRequest): Promise<CreateBulkUserJobAccessResponse> {
    try {
      const url = `${this.baseUrl}/users/${userId}/job-access/bulk`
      const response = await authenticatedApiService.post(url, accessData)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to create bulk user job access: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating bulk user job access:', error)
      throw error
    }
  }

  /**
   * Get job openings for a specific user based on their role and access permissions
   */
  static async getUserJobOpenings(userId: string): Promise<GetUserJobOpeningsResponse> {
    try {
      const url = `${this.baseUrl}/users/${userId}/job-openings`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch user job openings: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user job openings:', error)
      throw error
    }
  }
}
