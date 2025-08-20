import type { AIGeneratedJobTemplate, JobFormData } from '@/lib/job-types'

export class AIJobTransformer {
  /**
   * Transform AI generated job template to form data format
   * Only call this with successful AI responses that contain job_template
   */
  static transformToFormData(aiJobTemplate: AIGeneratedJobTemplate): JobFormData {
    // Map employment type from API format to UI format
    const employmentTypeMap: Record<string, string> = {
      'full_time': 'Full-time',
      'part_time': 'Part-time',
      'contract': 'Contract',
      'internship': 'Internship',
      'freelance': 'Freelance'
    }

    // Map compensation type from API format to UI format
    const compensationTypeMap: Record<string, string> = {
      'salary': 'Salary Range',
      'hourly': 'Hourly Rate',
      'contract': 'Contract'
    }

    // Format compensation value for UI display
    const formatCompensationValue = (value: number, currency: string): string => {
      if (currency === 'INR') {
        // Convert to LPA (Lakhs Per Annum) format for INR
        const lpa = value / 100000
        return `${lpa.toFixed(1)} LPA`
      } else {
        // Format with commas for other currencies
        return value.toLocaleString()
      }
    }

    return {
      title: aiJobTemplate.title,
      employmentType: employmentTypeMap[aiJobTemplate.employment_type] || aiJobTemplate.employment_type,
      minExperience: aiJobTemplate.minimum_experience,
      compensationType: compensationTypeMap[aiJobTemplate.compensation_type] || aiJobTemplate.compensation_type,
      compensationAmount: formatCompensationValue(aiJobTemplate.compensation_value, aiJobTemplate.compensation_currency),
      currency: aiJobTemplate.compensation_currency,
      description: aiJobTemplate.job_description
    }
  }
}