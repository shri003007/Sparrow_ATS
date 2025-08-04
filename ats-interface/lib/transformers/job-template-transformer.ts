import type { JobTemplateApiResponse, JobTemplate } from '@/lib/job-types'

export class JobTemplateTransformer {
  static transformApiToUi(apiTemplate: JobTemplateApiResponse): JobTemplate {
    // Format employment type (convert snake_case to readable format)
    const employmentTypeMap: Record<string, string> = {
      'full_time': 'Full-time',
      'part_time': 'Part-time',
      'contract': 'Contract',
      'internship': 'Internship',
      'freelance': 'Freelance'
    }

    const employmentType = employmentTypeMap[apiTemplate.employment_type] || apiTemplate.employment_type

    // Format compensation
    const formatCompensation = (type: string, value: number, currency: string): string => {
      if (type === 'salary') {
        // Convert to LPA format for Indian currency
        if (currency === 'INR') {
          const lpa = value / 100000
          return `₹${lpa} LPA`
        }
        return `${currency} ${value.toLocaleString()}`
      }
      return 'Confidential'
    }

    const compensation = formatCompensation(
      apiTemplate.compensation_type,
      apiTemplate.compensation_value,
      apiTemplate.compensation_currency
    )

    // Use the full job description as is
    const description = apiTemplate.job_description
    
    // Create a simple summary from the first paragraph for backwards compatibility
    const firstParagraph = description.split('\n\n')[0] || description.substring(0, 200) + '...'
    const summary = firstParagraph.trim()
    
    // For responsibilities, we'll keep an empty array since we're showing full description
    const responsibilities: string[] = []

    return {
      id: apiTemplate.id,
      title: apiTemplate.title,
      employmentType,
      minExperience: apiTemplate.minimum_experience,
      compensation,
      description: apiTemplate.job_description,
      summary: summary.trim(),
      responsibilities: responsibilities // Keep empty array
    }
  }

  static transformApiListToUi(apiTemplates: JobTemplateApiResponse[]): JobTemplate[] {
    return apiTemplates.map(template => this.transformApiToUi(template))
  }
}