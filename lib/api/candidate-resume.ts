import { authenticatedApiService } from './authenticated-api-service'
import { API_CONFIG } from '@/lib/config'

// Resume API types
export interface ResumeUploadRequest {
  candidate_email: string
  file_content: string // base64 encoded
  filename: string
}

export interface ResumeUploadResponse {
  message: string
  resume_url: string
  s3_key: string
  filename: string
  file_size: number
  updated_candidates_count: number
  operation: 'created' | 'updated'
}

export interface ResumeInfo {
  candidate_email: string
  resume_url: string
  s3_key: string
  candidate_id: string
  updated_at: string
  file_accessible: boolean
  presigned_url: string
  presigned_url_expires_in: number
}

export interface ResumeGetResponse {
  candidate_email: string
  resume: ResumeInfo
}

export interface ResumeDeleteResponse {
  message: string
  candidate_email: string
  updated_candidates_count: number
}

export interface ResumeError {
  Code: string
  Message: string
}

class CandidateResumeApiClass {
  private static baseUrl = API_CONFIG.CANDIDATES_DASHBOARD_BASE_URL

  async uploadResume(request: ResumeUploadRequest): Promise<ResumeUploadResponse> {
    if (!CandidateResumeApiClass.baseUrl) {
      throw new Error('NEXT_PUBLIC_CANDIDATES_DASHBOARD environment variable is not set')
    }

    const url = `${CandidateResumeApiClass.baseUrl}/candidate/resume/upload`
    
    console.log(`📤 [RESUME API] Uploading resume for: ${request.candidate_email}`)
    
    const response = await authenticatedApiService.post(url, request)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`❌ [RESUME API] Upload failed: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Failed to upload resume: ${response.status} ${response.statusText}`)
    }
    
    console.log(`✅ [RESUME API] Resume uploaded successfully for: ${request.candidate_email}`)
    return response.json()
  }

  async getResume(candidateEmail: string, expiration: number = 3600): Promise<ResumeGetResponse> {
    if (!CandidateResumeApiClass.baseUrl) {
      throw new Error('NEXT_PUBLIC_CANDIDATES_DASHBOARD environment variable is not set')
    }

    // Custom encoding: encode the email but preserve the @ symbol
    const encodedEmail = encodeURIComponent(candidateEmail).replace('%40', '@')
    const url = `${CandidateResumeApiClass.baseUrl}/candidate/resume/${encodedEmail}?expiration=${expiration}`
    
    console.log(`📥 [RESUME API] Fetching resume for: ${candidateEmail}`)
    
    const response = await authenticatedApiService.get(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({ Code: 'NotFoundError', Message: `No resume found for candidate ${candidateEmail}` }))
        throw new ResumeNotFoundError(errorData.Message || `No resume found for candidate ${candidateEmail}`)
      }
      
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`❌ [RESUME API] Get failed: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Failed to get resume: ${response.status} ${response.statusText}`)
    }
    
    console.log(`✅ [RESUME API] Resume fetched successfully for: ${candidateEmail}`)
    return response.json()
  }

  async deleteResume(candidateEmail: string): Promise<ResumeDeleteResponse> {
    if (!CandidateResumeApiClass.baseUrl) {
      throw new Error('NEXT_PUBLIC_CANDIDATES_DASHBOARD environment variable is not set')
    }

    // Custom encoding: encode the email but preserve the @ symbol
    const encodedEmail = encodeURIComponent(candidateEmail).replace('%40', '@')
    const url = `${CandidateResumeApiClass.baseUrl}/candidate/resume/${encodedEmail}`
    
    console.log(`🗑️ [RESUME API] Deleting resume for: ${candidateEmail}`)
    
    const response = await authenticatedApiService.delete(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        const errorData = await response.json().catch(() => ({ Code: 'NotFoundError', Message: `No resume found for candidate ${candidateEmail}` }))
        throw new ResumeNotFoundError(errorData.Message || `No resume found for candidate ${candidateEmail}`)
      }
      
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`❌ [RESUME API] Delete failed: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Failed to delete resume: ${response.status} ${response.statusText}`)
    }
    
    console.log(`✅ [RESUME API] Resume deleted successfully for: ${candidateEmail}`)
    return response.json()
  }

  // Utility function to convert file to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:application/pdf;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }
}

// Custom error class for resume not found
export class ResumeNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResumeNotFoundError'
  }
}

export const CandidateResumeApi = new CandidateResumeApiClass()
