import { API_CONFIG } from '@/lib/config'

export interface ResumeEvaluationRequest {
  candidate_round_id: string
  job_opening_id: string
}

export interface ResumeEvaluationResponse {
  candidate_round_id: string
  candidate_id: string
  job_opening_id: string
  evaluation_criteria: string
  competency_evaluation: {
    competency_scores: Array<{
      competency_name: string
      questions: Array<{
        question_id: string
        question: string
        score: number
        explanation: string
      }>
      percentage_score: number
    }>
    overall_percentage_score: number
  }
  evaluation_summary: string
  overall_percentage_score: number
  success: boolean
  error_message: string | null
  resume_text_extracted: boolean
  resume_images_extracted: number
  evaluation_method: string
  // Additional fields for error handling
  has_resume?: boolean
  evaluation_failed?: boolean
  retry_attempted?: boolean
}

// Interview transcript evaluation (file-based)
export interface InterviewEvaluationRequest {
  candidate_round_id: string
  job_opening_id: string
  file_type: 'pdf' | 'txt'
  file_content: string // base64 (without data: prefix)
}

export interface InterviewEvaluationResponse {
  candidate_id: string
  job_id: string
  round_id?: string
  job_pipeline_id?: string
  round_name?: string
  round_type?: string
  evaluation_summary?: string
  competency_evaluation?: {
    competency_scores: Array<{
      competency_name: string
      questions: Array<{
        question_id: string
        question: string
        score: number
        explanation: string
      }>
      percentage_score: number
    }>
    overall_percentage_score: number
  }
  interviewer_evaluation_summary?: string
  overall_percentage_score?: number | null
  success: boolean
  error_message: string | null
  file_stored?: boolean
  file_s3_path?: string
  file_metadata?: {
    file_type: string
    content_type: string
    file_size: number
    content_hash: string
    upload_timestamp: string
  }
  result_saved?: boolean
  result_action?: string
  result_id?: string
}

interface BatchResumeEvaluationRequest {
  requests: ResumeEvaluationRequest[]
}

// Configuration
const BATCH_SIZE = 20
const MAX_RETRIES = 3 // Maximum 3 retries per candidate
const RETRY_DELAY = 1000 // 1 second

// Get API URL from config
const getResumeEvaluationApiUrl = (): string => {
  if (!API_CONFIG.RESUME_EVALUATION_API_URL) {
    throw new Error('Resume evaluation API URL not configured')
  }
  return API_CONFIG.RESUME_EVALUATION_API_URL
}

const getCandidateEvaluationApiUrl = (): string => {
  if (!API_CONFIG.CANDIDATE_EVALUATION_API_URL) {
    throw new Error('Candidate evaluation API URL not configured')
  }
  return API_CONFIG.CANDIDATE_EVALUATION_API_URL
}

// Helper function to create error response
const createErrorResponse = (
  request: ResumeEvaluationRequest, 
  errorMessage: string, 
  hasResume: boolean = true,
  retryAttempted: boolean = false
): ResumeEvaluationResponse => ({
  candidate_round_id: request.candidate_round_id,
  candidate_id: '',
  job_opening_id: request.job_opening_id,
  evaluation_criteria: '',
  competency_evaluation: {
    competency_scores: [],
    overall_percentage_score: 0
  },
  evaluation_summary: errorMessage,
  overall_percentage_score: 0,
  success: false,
  error_message: errorMessage,
  resume_text_extracted: false,
  resume_images_extracted: 0,
  evaluation_method: 'failed',
  has_resume: hasResume,
  evaluation_failed: true,
  retry_attempted: retryAttempted
})

// Single resume evaluation with retry logic
export async function evaluateResumeCandidate(
  request: ResumeEvaluationRequest, 
  retryCount: number = 0
): Promise<ResumeEvaluationResponse> {
  // CRITICAL: Prevent infinite retries
  if (retryCount > MAX_RETRIES) {
    console.error(`🚨 CRITICAL: Retry count (${retryCount}) exceeds maximum allowed (${MAX_RETRIES}) for candidate ${request.candidate_round_id}`)
    return createErrorResponse(
      request, 
      `Critical error: Too many retry attempts (${retryCount})`,
      true,
      true
    )
  }

  // Log every attempt for tracking
  if (retryCount === 0) {
    console.log(`🚀 Starting evaluation for candidate ${request.candidate_round_id}`)
  } else {
    console.log(`🔄 Retry attempt ${retryCount}/${MAX_RETRIES} for candidate ${request.candidate_round_id}`)
  }

  try {
    const apiUrl = getResumeEvaluationApiUrl()
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    // CRITICAL: Handle 500 errors properly by reading response body first
    let data
    try {
      data = await response.json()
    } catch (parseError) {
      // If we can't parse JSON, treat as network error
      throw new Error(`Failed to parse response: ${response.status} ${response.statusText}`)
    }

    // Check for 500 errors with specific "no resume" messages
    if (!response.ok) {
      // For 500 errors, check if it's a "no resume" error first
      if (response.status === 500 && data && !data.success) {
        // CRITICAL: Never retry if no resume URL found, even on 500 error
        if (data.error_message?.includes('No resume URL found') || 
            data.error_message?.includes('no resume') ||
            data.error_message?.includes('resume not found')) {
          console.log(`🚫 500 Error - No resume found for candidate ${request.candidate_round_id} - stopping retries`)
          return createErrorResponse(
            request, 
            'No resume found for this candidate. Please upload a resume to proceed with evaluation.',
            false,
            retryCount > 0
          )
        }
      }
      
      // For other HTTP errors, throw to trigger retry logic
      throw new Error(`Resume evaluation HTTP error! status: ${response.status}, message: ${data?.error_message || response.statusText}`)
    }
    
    // Check if the API returned an error response
    if (!data.success) {
      // CRITICAL: Never retry if no resume URL found
      if (data.error_message?.includes('No resume URL found') || 
          data.error_message?.includes('no resume') ||
          data.error_message?.includes('resume not found')) {
        console.log(`🚫 No resume found for candidate ${request.candidate_round_id} - stopping retries`)
        return createErrorResponse(
          request, 
          'No resume found for this candidate. Please upload a resume to proceed with evaluation.',
          false,
          retryCount > 0
        )
      }
      
      // CRITICAL: Enforce maximum retry limit
      if (retryCount >= MAX_RETRIES) {
        console.error(`🚫 Maximum retries (${MAX_RETRIES}) exceeded for candidate ${request.candidate_round_id}`)
        return createErrorResponse(
          request, 
          `Evaluation failed after ${MAX_RETRIES} attempts: ${data.error_message}`,
          true,
          true
        )
      }
      
      // Handle validation errors with retry (only if under retry limit)
      if (data.error_message?.includes('validation error')) {
        console.log(`🔄 Validation error for candidate ${request.candidate_round_id}, retrying... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return evaluateResumeCandidate(request, retryCount + 1)
      }
      
      // Handle other API errors with retry (only if under retry limit)
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 API error for candidate ${request.candidate_round_id}, retrying... (attempt ${retryCount + 1}/${MAX_RETRIES}): ${data.error_message}`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return evaluateResumeCandidate(request, retryCount + 1)
      }
      
      // Final failure after all retries exhausted
      console.error(`🚫 API error for candidate ${request.candidate_round_id} after ${retryCount} attempts:`, data.error_message)
      return createErrorResponse(
        request, 
        `Evaluation failed: ${data.error_message}`,
        true,
        retryCount > 0
      )
    }

    // Success case
    console.log(`✅ Evaluation successful for candidate ${request.candidate_round_id}${retryCount > 0 ? ` after ${retryCount} retries` : ''}`)
    return {
      ...data,
      has_resume: true,
      evaluation_failed: false,
      retry_attempted: retryCount > 0
    }
  } catch (error) {
    console.error(`Error evaluating resume candidate ${request.candidate_round_id}:`, error)
    
    // CRITICAL: Enforce maximum retry limit for network errors too
    if (retryCount >= MAX_RETRIES) {
      console.error(`🚫 Maximum retries (${MAX_RETRIES}) exceeded for candidate ${request.candidate_round_id} - network error`)
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error'
      return createErrorResponse(
        request, 
        `Network error after ${MAX_RETRIES} attempts: ${errorMessage}`,
        true,
        true
      )
    }
    
    // Retry on network/HTTP errors (only if under retry limit)
    console.log(`🔄 Network error for candidate ${request.candidate_round_id}, retrying... (attempt ${retryCount + 1}/${MAX_RETRIES})`)
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
    return evaluateResumeCandidate(request, retryCount + 1)
  }
}

// Interview evaluation from uploaded transcript file
export async function evaluateInterviewCandidateFromFile(
  request: InterviewEvaluationRequest
): Promise<InterviewEvaluationResponse> {
  const apiUrl = getCandidateEvaluationApiUrl()
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error_message || `Interview evaluation failed: ${response.status}`)
  }
  return data as InterviewEvaluationResponse
}

// Batch resume evaluation with delay between batches
export async function evaluateResumeCandidatesBatch(
  requests: ResumeEvaluationRequest[],
  onBatchComplete?: (completed: number, total: number) => void,
  onCandidateComplete?: (result: ResumeEvaluationResponse) => void
): Promise<ResumeEvaluationResponse[]> {
  const results: ResumeEvaluationResponse[] = []
  const batches = []
  
  // Split requests into batches
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    batches.push(requests.slice(i, i + BATCH_SIZE))
  }

  console.log(`Processing ${requests.length} resume evaluations in ${batches.length} batches of ${BATCH_SIZE}`)

  // Process batches sequentially with delay
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    
    try {
      // Process current batch in parallel
      const batchPromises = batch.map(async (request) => {
        const result = await evaluateResumeCandidate(request)
        if (onCandidateComplete) {
          onCandidateComplete(result)
        }
        return result
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      if (onBatchComplete) {
        onBatchComplete(results.length, requests.length)
      }

      // Add delay between batches to avoid overwhelming the server
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
      }

    } catch (error) {
      console.error(`Failed to process batch ${batchIndex + 1}:`, error)
      // Continue with next batch instead of failing entirely
    }
  }

  return results
}