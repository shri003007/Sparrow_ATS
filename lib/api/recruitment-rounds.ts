import { API_CONFIG } from '@/lib/config'
import type { RecruitmentRoundsApiResponse } from '@/lib/hiring-types'

export class RecruitmentRoundsApi {
  private static baseUrl = API_CONFIG.BASE_URL

  static async getRecruitmentRounds(): Promise<RecruitmentRoundsApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.RECRUITMENT_ROUNDS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to fetch recruitment rounds:', error)
      throw error
    }
  }
}