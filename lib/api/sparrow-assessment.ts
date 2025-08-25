import { config } from '../config'

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
          recording_duration: number
        }
      }
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
    const response = await fetch('https://kl85uizp68.execute-api.us-west-2.amazonaws.com/api/get-answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: userEmail,
        assessment_id: assessmentId
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sparrow assessment data: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching sparrow assessment data:', error)
    throw error
  }
}
