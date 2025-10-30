import { API_CONFIG } from '../config'
import { authenticatedApiService } from './authenticated-api-service'

export interface SparrowAssessmentResponse {
  status: string
  message: string
  data: {
    audio_url: string
    audio_filename: string
    audio_size: number
    questions: {
      user_email: string
      assessment_id: string
      fetched_at: string
      questions: Array<{
        question_id: string
        question_text: string
        question_order: number
        original_id: string
      }>
    }
    images?: Array<{
      filename: string
      url: string
      size: number
      key: string
    }>
    image_count?: number
    expires_in: number
    logs: {
      user_email: string
      assessment_id: string
      uploaded_at: string
      logs: {
        session_start: string
        user_agent: string
        interactions: Array<{
          question: string
          question_id: string
          start_time: string
          end_time: string
          duration_seconds: number
        }>
        performance_metrics: {
          recording_duration: number  // Duration in seconds
        }
      }
    }
    cheating_score?: {
      cheating_score: number
      risk_level: string
      delayed_response_count: number
      question_repetition_count: number
      visual_score: number
      suspicious_indicators: string[]
      image_analysis_summary: string
      images_analyzed?: number
      batches_processed?: number
      analyzed_at?: string
      user_email?: string
      assessment_id?: string
    }
  }
}

/**
 * Fetch audio assessment data for a candidate
 */
export async function getSparrowAssessmentData(
  userEmail: string,
  assessmentId: string
): Promise<SparrowAssessmentResponse> {
  try {
    if (!API_CONFIG.GET_ANSWERS_API_URL) {
      throw new Error('GET_ANSWERS_API_URL is not configured. Please set NEXT_PUBLIC_GET_ANSWERS in your environment variables.')
    }

    // Force token refresh to ensure we have the latest token
    await authenticatedApiService.refreshToken()
    
    const response = await authenticatedApiService.post(API_CONFIG.GET_ANSWERS_API_URL!, {
      user_email: userEmail,
      assessment_id: assessmentId
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      
      // Handle 404 errors gracefully - this is expected when no assessment data exists
      if (response.status === 404) {
        return null as any // Return null to indicate no data available
      }
      
      throw new Error(`Failed to fetch sparrow assessment data: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching sparrow assessment data:', error)
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Sparrow Assessment API Error: ${error.message}`)
    }
    throw new Error('Unknown error occurred while fetching sparrow assessment data')
  }
}
