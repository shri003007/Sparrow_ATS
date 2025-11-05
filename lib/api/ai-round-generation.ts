import { API_CONFIG } from '@/lib/config'
import { authenticatedApiService } from './authenticated-api-service'

export interface GenerateRoundCompetencyRequest {
  user_input: string
  created_by: string
}

export interface RoundCompetencyApiResponse {
  name: string
  description: string
  rubric_scorecard: Record<string, string>
}

export interface GenerateRoundCompetencyApiResponse {
  success: boolean
  is_valid: boolean
  round_details: {
    success: boolean
    is_valid: boolean
    round_name: string
    competencies: RoundCompetencyApiResponse[]
    evaluation_criteria: string
    custom_question_competency?: string
    created_by: string
    created_at: string
    updated_at: string
  }
  message: string
  generation_info: {
    model_used: string
    input_tokens: number
    output_tokens: number
    reason: string
  }
}

export class AIRoundGenerationApi {
  private static baseUrl = API_CONFIG.BASE_URL

  /**
   * Generate round competency using AI
   */
  static async generateRoundCompetency(
    request: GenerateRoundCompetencyRequest
  ): Promise<GenerateRoundCompetencyApiResponse> {
    const url = `${this.baseUrl}/generate-round-competency`
    
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
      console.error('AI round generation failed:', error)
      throw error
    }
  }
}
