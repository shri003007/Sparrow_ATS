import { API_CONFIG } from '@/lib/config'
import { authenticatedApiService } from './authenticated-api-service'

export interface User {
  id: string
  email: string
  first_name: string
  last_name?: string
  role: 'admin' | 'hr_manager' | 'hiring_manager' | 'interviewer' | 'recruiter'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserRequest {
  email: string
  first_name: string
  last_name?: string
  role?: 'admin' | 'hr_manager' | 'hiring_manager' | 'interviewer' | 'recruiter'
  is_active?: boolean
}

export interface CreateUserResponse {
  message: string
  user: User
}

export interface GetUsersResponse {
  users: User[]
}

export interface GetUserResponse {
  user: User
}

export interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  role?: 'admin' | 'hr_manager' | 'hiring_manager' | 'interviewer' | 'recruiter'
  is_active?: boolean
}

export interface UpdateUserResponse {
  message: string
  user: User
}

export interface DeleteUserResponse {
  message: string
}

export class UsersApi {
  private static baseUrl = API_CONFIG.BASE_URL

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const url = `${this.baseUrl}/users`
      const response = await authenticatedApiService.post(url, userData)

      if (!response.ok) {
        const errorText = await response.text()
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          // Response is not JSON
        }
        
        throw new Error(`Failed to create user: ${response.status} - ${(errorData as any).message || errorText || 'Unknown error'}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  /**
   * Get all users with optional filtering
   */
  static async getUsers(params?: {
    role?: string
    is_active?: boolean
  }): Promise<GetUsersResponse> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.role) searchParams.append('role', params.role)
      if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString())

      const url = `${this.baseUrl}/users${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  /**
   * Get a specific user by ID
   */
  static async getUserById(userId: string): Promise<GetUserResponse> {
    try {
      const url = `${this.baseUrl}/users/${userId}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      throw error
    }
  }

  /**
   * Get a user by email address
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Since there's no direct endpoint for getting user by email,
      // we'll fetch all users and filter by email
      const response = await this.getUsers()
      const user = response.users.find(u => u.email === email)
      return user || null
    } catch (error) {
      console.error('Error fetching user by email:', error)
      throw error
    }
  }

  /**
   * Update an existing user
   */
  static async updateUser(userId: string, userData: UpdateUserRequest): Promise<UpdateUserResponse> {
    try {
      const url = `${this.baseUrl}/users/${userId}`
      const response = await authenticatedApiService.put(url, userData)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to update user: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId: string): Promise<DeleteUserResponse> {
    try {
      const url = `${this.baseUrl}/users/${userId}`
      const response = await authenticatedApiService.delete(url)

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  /**
   * Check if user exists and create if not - utility method for login integration
   */
  static async ensureUserExists(email: string, firstName: string, lastName?: string): Promise<User> {
    try {
      // First, try to get the user by email
      let existingUser: User | null = null
      
      try {
        existingUser = await this.getUserByEmail(email)
      } catch (getUserError) {
        // Continue to create user if getting user fails (normal for new users)
      }
      
      if (existingUser) {
        return existingUser
      }

      // User doesn't exist, create a new one with 'recruiter' role as default
      try {
        const createResponse = await this.createUser({
          email,
          first_name: firstName,
          last_name: lastName,
          role: 'recruiter',
          is_active: true
        })

        return createResponse.user
      } catch (createError: any) {
        // If user creation fails because user already exists, try to get the user again
        if (createError.message && createError.message.includes('already exists')) {
          // Wait a bit and try to get the user again
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const retryUser = await this.getUserByEmail(email)
          if (retryUser) {
            return retryUser
          }
        }
        
        // Re-throw the error if it's not a "user already exists" error
        throw createError
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error)
      throw error
    }
  }
}
