import type { 
  CandidateApiResponse, 
  CandidateDisplay, 
  CandidateUIStatus,
  CandidateCreateRequest 
} from '@/lib/candidate-types'

export class CandidateTransformer {
  /**
   * Transform API candidate data to UI display format
   */
  static transformApiToDisplay(apiCandidate: CandidateApiResponse): CandidateDisplay {
    return {
      id: apiCandidate.id,
      name: apiCandidate.name,
      email: apiCandidate.email,
      mobile_phone: apiCandidate.mobile_phone,
      resume_url: apiCandidate.resume_url,
      experience_display: this.formatExperience(apiCandidate.experience_years, apiCandidate.experience_months),
      current_salary_display: this.formatSalary(apiCandidate.current_salary, apiCandidate.current_salary_currency),
      expected_salary_display: this.formatSalary(apiCandidate.expected_salary, apiCandidate.expected_salary_currency),
      available_to_join_display: this.formatAvailability(apiCandidate.available_to_join_days),
      current_location: apiCandidate.current_location,
      status: this.mapApiRoundStatusToUI(apiCandidate.round_status),
      source: apiCandidate.source,
      notes: apiCandidate.notes,
      created_at: apiCandidate.created_at
    }
  }

  /**
   * Transform multiple API candidates to UI display format
   */
  static transformApiListToDisplay(apiCandidates: CandidateApiResponse[]): CandidateDisplay[] {
    return apiCandidates.map(candidate => this.transformApiToDisplay(candidate))
  }

  /**
   * Transform manual entry form data to API request format
   */
  static transformManualEntryToApiRequest(
    formData: any, 
    jobOpeningId: string
  ): CandidateCreateRequest {
    return {
      job_opening_id: jobOpeningId,
      resume_url: formData.resumeUrl || '',
      name: formData.name,
      email: formData.email,
      mobile_phone: formData.mobilePhone,
      experience_months: formData.experienceYears ? Math.round(parseFloat(formData.experienceYears) * 12) : undefined,
      current_salary: formData.currentSalary ? parseFloat(formData.currentSalary) : undefined,
      current_salary_currency: formData.currentSalaryCurrency || 'USD',
      expected_salary: formData.expectedSalary ? parseFloat(formData.expectedSalary) : undefined,
      expected_salary_currency: formData.expectedSalaryCurrency || 'USD',
      available_to_join_days: formData.availableToJoinDays ? parseInt(formData.availableToJoinDays) : undefined,
      current_location: formData.currentLocation || undefined,
      overall_status: 'active',
      source: formData.source || 'Manual Entry',
      notes: formData.notes || undefined
    }
  }

  /**
   * Transform CSV candidate data to API request format
   */
  static transformCSVToApiRequest(
    csvCandidate: any,
    jobOpeningId: string
  ): CandidateCreateRequest {
    return {
      job_opening_id: jobOpeningId,
      resume_url: csvCandidate.resumeUrl || '',
      name: csvCandidate.name,
      email: csvCandidate.email,
      mobile_phone: csvCandidate.mobilePhone,
      experience_months: csvCandidate.experienceMonths,
      current_salary: csvCandidate.currentSalary,
      current_salary_currency: csvCandidate.currentSalaryCurrency || 'USD',
      expected_salary: csvCandidate.expectedSalary,
      expected_salary_currency: csvCandidate.expectedSalaryCurrency || 'USD',
      available_to_join_days: csvCandidate.availableToJoinDays,
      current_location: csvCandidate.currentLocation,
      overall_status: 'active'
    }
  }

  /**
   * Format experience years and months for display
   */
  private static formatExperience(years: number, months: number): string {
    if (!years && !months) return 'Not specified'
    
    const parts: string[] = []
    if (years > 0) {
      parts.push(`${years} yr${years !== 1 ? 's' : ''}`)
    }
    if (months > 0) {
      parts.push(`${months} mo${months !== 1 ? 's' : ''}`)
    }
    
    return parts.join(' ')
  }

  /**
   * Format salary with currency for display
   */
  private static formatSalary(amount: number, currency: string): string {
    if (!amount) return 'Not specified'
    
    // Format based on currency
    if (currency === 'INR') {
      // Convert to Lakhs for INR
      const lakhs = amount / 100000
      return `₹${lakhs.toFixed(1)}L`
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString()}`
    } else if (currency === 'EUR') {
      return `€${amount.toLocaleString()}`
    } else if (currency === 'GBP') {
      return `£${amount.toLocaleString()}`
    } else {
      return `${currency} ${amount.toLocaleString()}`
    }
  }

  /**
   * Format availability days for display
   */
  private static formatAvailability(days: number): string {
    if (!days) return 'Immediate'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  /**
   * Map API round_status to UI status
   * API round_status: 'action_pending' | 'selected' | 'rejected'
   * UI: 'selected' | 'action_pending' | 'rejected'
   */
  private static mapApiRoundStatusToUI(roundStatus: string): CandidateUIStatus {
    // Direct mapping since API round_status already matches UI status values
    switch (roundStatus) {
      case 'selected':
        return 'selected'
      case 'rejected':
        return 'rejected'
      case 'action_pending':
      default:
        return 'action_pending'
    }
  }

  /**
   * Map UI status to API round_status
   */
  static mapUIStatusToRoundStatus(uiStatus: CandidateUIStatus): string {
    // Direct mapping since UI status matches API round_status values
    switch (uiStatus) {
      case 'selected':
        return 'selected'
      case 'rejected':
        return 'rejected'
      case 'action_pending':
      default:
        return 'action_pending'
    }
  }
}