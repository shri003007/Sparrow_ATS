import { API_CONFIG } from '@/lib/config'
import { authenticatedApiService } from './authenticated-api-service'

export interface SparrowTest {
  test_id: string
  test_name: string
  description?: string
  created_at?: string
  created_by?: string
}

export interface SparrowAssessment {
  assessment_id: string
  assessment_name: string
  order: number
  description: string
  type: string
  test_id: string
  time_limit: number
  no_of_ques: number
}

export interface SparrowTestsResponse {
  tests: SparrowTest[]
}

export interface SparrowAssessmentsResponse {
  test_id: string
  assessments: SparrowAssessment[]
  assessment_count: number
}

export interface SparrowAssessmentMappingRequest {
  sparrow_assessment_id: string
  job_round_template_id: string
}

export interface SparrowAssessmentMappingResponse {
  message: string
  mapping: {
    id: number
    sparrow_assessment_id: string
    job_round_templat_id: string
  }
}

export class SparrowAssessmentTestsApi {
  private static sparrowAssessmentUrl = API_CONFIG.SPARROW_ASSESSMENT_API_URL
  private static candidatesBaseUrl = API_CONFIG.CANDIDATES_BASE_URL

  /**
   * Get all available tests from Sparrow Assessment
   */
  static async getAllTests(): Promise<SparrowTestsResponse> {
    if (!this.sparrowAssessmentUrl) {
      throw new Error('NEXT_PUBLIC_SPARROW_ASSESSMENT environment variable is not set')
    }

    const url = `${this.sparrowAssessmentUrl}${API_CONFIG.ENDPOINTS.SPARROW_TESTS}`
    
    try {
      const response = await authenticatedApiService.get(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch Sparrow tests:', error)
      throw error
    }
  }

  /**
   * Get assessments for a specific test ID
   */
  static async getAssessmentsByTestId(testId: string): Promise<SparrowAssessmentsResponse> {
    if (!this.sparrowAssessmentUrl) {
      throw new Error('NEXT_PUBLIC_SPARROW_ASSESSMENT environment variable is not set')
    }

    const url = `${this.sparrowAssessmentUrl}${API_CONFIG.ENDPOINTS.SPARROW_ASSESSMENTS}/${testId}`
    
    try {
      const response = await authenticatedApiService.get(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Failed to fetch assessments for test ${testId}:`, error)
      throw error
    }
  }

  /**
   * Create Sparrow Assessment round mapping
   */
  static async createAssessmentMapping(
    request: SparrowAssessmentMappingRequest
  ): Promise<SparrowAssessmentMappingResponse> {
    if (!this.candidatesBaseUrl) {
      throw new Error('NEXT_PUBLIC_CANDIDATES_API_BASE_URL environment variable is not set')
    }

    const url = `${this.candidatesBaseUrl}${API_CONFIG.ENDPOINTS.SPARROW_ASSESSMENT_MAPPING}`
    
    try {
      const response = await authenticatedApiService.post(url, request)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || 
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to create Sparrow assessment mapping:', error)
      throw error
    }
  }
}
