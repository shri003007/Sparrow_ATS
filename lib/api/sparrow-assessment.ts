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
    console.log(`Fetching sparrow assessment data for email: ${userEmail}, assessmentId: ${assessmentId}`)
    
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
      const errorText = await response.text().catch(() => 'Unknown error')
      
      // Handle 404 errors gracefully - this is expected when no assessment data exists
      if (response.status === 404) {
        console.log(`No sparrow assessment data found for ${userEmail}/${assessmentId} (404 - this is normal)`)
        return null as any // Return null to indicate no data available
      }
      
      throw new Error(`Failed to fetch sparrow assessment data: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Successfully fetched sparrow assessment data:', data)
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
