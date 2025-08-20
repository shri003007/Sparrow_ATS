import type { 
  JobFormData, 
  JobOpeningCreateRequest, 
  JobOpeningUpdateRequest,
  JobOpeningResponse
} from '@/lib/job-types'

export class JobOpeningTransformer {
  // Transform UI form data to API create request
  static transformFormToCreateRequest(
    formData: JobFormData, 
    createdBy: string
  ): JobOpeningCreateRequest {
    // Map employment types
    const employmentTypeMap: Record<string, string> = {
      'Full-time': 'full_time',
      'Part-time': 'part_time',
      'Contract': 'contract',
      'Freelance': 'freelance'
    }

    // Map compensation types
    const compensationTypeMap: Record<string, string> = {
      'Salary Range': 'salary',
      'Fixed Salary': 'salary',
      'Hourly Rate': 'hourly',
      'Confidential': 'salary'
    }

    // Parse compensation value
    const compensationValue = this.parseCompensationValue(formData.compensationAmount)

    const request: JobOpeningCreateRequest = {
      posting_title: formData.title,
      custom_job_description: formData.description,
      employment_type: employmentTypeMap[formData.employmentType] || 'full_time',
      minimum_experience: formData.minExperience,
      compensation_type: compensationTypeMap[formData.compensationType] || 'salary',
      compensation_value: compensationValue,
      compensation_currency: formData.currency,
      created_by: createdBy
    }

    return request
  }

  // Transform UI form data to API update request
  static transformFormToUpdateRequest(formData: JobFormData): JobOpeningUpdateRequest {
    // Map employment types
    const employmentTypeMap: Record<string, string> = {
      'Full-time': 'full_time',
      'Part-time': 'part_time',
      'Contract': 'contract',
      'Freelance': 'freelance'
    }

    // Map compensation types
    const compensationTypeMap: Record<string, string> = {
      'Salary Range': 'salary',
      'Fixed Salary': 'salary',
      'Hourly Rate': 'hourly',
      'Confidential': 'salary'
    }

    // Parse compensation value
    const compensationValue = this.parseCompensationValue(formData.compensationAmount)

    const request: JobOpeningUpdateRequest = {
      posting_title: formData.title,
      custom_job_description: formData.description,
      employment_type: employmentTypeMap[formData.employmentType] || 'full_time',
      minimum_experience: formData.minExperience,
      compensation_type: compensationTypeMap[formData.compensationType] || 'salary',
      compensation_value: compensationValue,
      compensation_currency: formData.currency
    }

    return request
  }

  // Transform API response to UI form data
  static transformResponseToForm(response: JobOpeningResponse): JobFormData {
    // Map employment types back to UI format
    const employmentTypeMap: Record<string, string> = {
      'full_time': 'Full-time',
      'part_time': 'Part-time',
      'contract': 'Contract',
      'freelance': 'Freelance'
    }

    // Map compensation types back to UI format
    const compensationTypeMap: Record<string, string> = {
      'salary': 'Salary Range',
      'hourly': 'Hourly Rate'
    }

    // Format compensation amount
    const compensationAmount = this.formatCompensationValue(
      response.compensation_value, 
      response.compensation_currency
    )

    return {
      title: response.posting_title,
      employmentType: employmentTypeMap[response.employment_type] || 'Full-time',
      minExperience: response.minimum_experience || '1 year',
      compensationType: compensationTypeMap[response.compensation_type || 'salary'] || 'Salary Range',
      compensationAmount,
      currency: response.compensation_currency || 'INR',
      description: response.custom_job_description
    }
  }

  // Parse compensation value from UI string to number
  private static parseCompensationValue(compensationAmount: string): number | undefined {
    if (!compensationAmount) return undefined
    
    // Remove common formatting characters and extract numbers
    const cleanAmount = compensationAmount.replace(/[,\s₹$€]/g, '')
    
    // Try to extract a single number or the first number from a range
    const match = cleanAmount.match(/(\d+(?:\.\d+)?)/)
    
    if (match) {
      return parseFloat(match[1])
    }
    
    return undefined
  }

  // Format compensation value from number to UI string
  private static formatCompensationValue(
    value?: number, 
    currency?: string
  ): string {
    if (!value) return ''
    
    if (currency === 'INR') {
      // Convert to LPA format for display
      const lpa = value / 100000
      return `${lpa} LPA`
    }
    
    return value.toLocaleString()
  }
}