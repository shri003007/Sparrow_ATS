import { API_CONFIG } from '@/lib/config'
import type { JobRoundTemplateBulkRequest, JobRoundTemplateBulkResponse } from '@/lib/job-types'
import { authenticatedApiService } from './authenticated-api-service'

export class JobRoundTemplatesApi {
  /**
   * Create multiple job round templates for a job opening
   */
  static async createJobRoundTemplates(
    jobOpeningId: string, 
    request: JobRoundTemplateBulkRequest
  ): Promise<JobRoundTemplateBulkResponse> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_ROUND_TEMPLATES}/${jobOpeningId}/round-templates/bulk`
    
    const response = await authenticatedApiService.post(url, request)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Failed to create job round templates: ${response.status} - ${errorData}`)
    }

    return response.json()
  }
}