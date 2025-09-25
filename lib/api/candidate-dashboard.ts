import { authenticatedApiService } from './authenticated-api-service'
import { API_CONFIG } from '@/lib/config'

interface JobInfo {
  id: string
  posting_title: string
  custom_job_description: string
  job_status: string
  employment_type: string
  minimum_experience: string
  compensation_type: string
  compensation_value: number | null
  compensation_currency: string
  created_by: string
  created_at: string
  published_at: string
  expires_at: string | null
  has_rounds_started: boolean
}

interface JobRoundTemplate {
  id: string
  job_opening_id: string
  round_id: string | null
  order_index: number
  is_active: boolean
  is_required: boolean
  created_at: string
  round_name: string
  round_type: string
}

interface CandidateRound {
  id: string
  candidate_id: string
  job_round_template_id: string
  round_id: string | null
  order_index: number
  round_type: string
  is_active: boolean
  created_at: string
  created_by: string
  notes: string | null
  status: 'action_pending' | 'selected' | 'rejected'
  is_evaluation: boolean
  is_deleted: boolean
  updated_at: string | null
}

interface CandidateDashboardData {
  id: string
  name: string
  email: string
  mobile_phone: string
  resume_url: string
  experience_years: number | null
  experience_months: number | null
  current_salary: number | null
  current_salary_currency: string
  expected_salary: number | null
  expected_salary_currency: string
  available_to_join_days: number | null
  current_location: string
  overall_status: string
  round_status: string
  source: string | null
  notes: string | null
  overall_evaluation: any | null
  created_at: string
  updated_at: string
  job_info: JobInfo
  job_round_templates: JobRoundTemplate[]
  candidate_rounds: CandidateRound[]
}

export interface CandidateDashboardResponse {
  email: string
  candidates: CandidateDashboardData[]
  total_count: number
}

// Activity types for timeline
export interface ActivityItem {
  id: string
  type: 'application' | 'stage_move' | 'feedback' | 'evaluation'
  timestamp: string
  job_id: string
  job_title: string
  description: string
  details?: {
    from_stage?: string
    to_stage?: string
    round_name?: string
    round_type?: string
    status?: string
    feedback?: string
  }
}

class CandidateDashboardApiClass {
  private static baseUrl = API_CONFIG.CANDIDATES_DASHBOARD_BASE_URL

  async getCandidateByEmail(email: string): Promise<CandidateDashboardResponse> {
    if (!CandidateDashboardApiClass.baseUrl) {
      throw new Error('NEXT_PUBLIC_CANDIDATES_DASHBOARD environment variable is not set')
    }

    // Custom encoding: encode the email but preserve the @ symbol
    const encodedEmail = encodeURIComponent(email).replace('%40', '@')
    const url = `${CandidateDashboardApiClass.baseUrl}/candidate/by-email/${encodedEmail}`
    
    console.log(`🔍 [CANDIDATE DASHBOARD] Making authenticated request to: ${url}`)
    
    const response = await authenticatedApiService.get(url)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`❌ [CANDIDATE DASHBOARD] API request failed: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Failed to fetch candidate dashboard data: ${response.status} ${response.statusText}`)
    }
    
    console.log(`✅ [CANDIDATE DASHBOARD] Successfully fetched data for: ${email}`)
    return response.json()
  }

  // Transform the API response into activity timeline items
  transformToActivityTimeline(data: CandidateDashboardResponse): ActivityItem[] {
    const activities: ActivityItem[] = []

    // Process each candidate (job application)
    data.candidates.forEach(candidate => {
      // Add application activity
      activities.push({
        id: `application-${candidate.id}-${candidate.job_info.id}`,
        type: 'application',
        timestamp: candidate.created_at,
        job_id: candidate.job_info.id,
        job_title: candidate.job_info.posting_title,
        description: `Applied for ${candidate.job_info.posting_title}`,
        details: {
          status: candidate.overall_status
        }
      })

      // Add round activities
      candidate.candidate_rounds.forEach(round => {
        const roundTemplate = candidate.job_round_templates.find(
          template => template.id === round.job_round_template_id
        )

        activities.push({
          id: `round-${round.id}`,
          type: 'stage_move',
          timestamp: round.created_at,
          job_id: candidate.job_info.id,
          job_title: candidate.job_info.posting_title,
          description: `Moved to ${roundTemplate?.round_name || 'Unknown Round'}`,
          details: {
            round_name: roundTemplate?.round_name,
            round_type: roundTemplate?.round_type,
            status: round.status,
            to_stage: roundTemplate?.round_name
          }
        })

        // Add evaluation activity if evaluated
        if (round.is_evaluation && round.updated_at) {
          activities.push({
            id: `evaluation-${round.id}`,
            type: 'evaluation',
            timestamp: round.updated_at,
            job_id: candidate.job_info.id,
            job_title: candidate.job_info.posting_title,
            description: `Evaluation completed for ${roundTemplate?.round_name || 'Unknown Round'}`,
            details: {
              round_name: roundTemplate?.round_name,
              round_type: roundTemplate?.round_type,
              status: round.status
            }
          })
        }
      })
    })

    // Sort activities by timestamp (newest first)
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
}

export const CandidateDashboardApi = new CandidateDashboardApiClass()
