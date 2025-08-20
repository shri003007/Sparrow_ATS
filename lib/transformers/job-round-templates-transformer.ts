import type { HiringRound } from '@/lib/hiring-types'
import type { JobRoundTemplateRequest, JobRoundTemplateBulkRequest, JobRoundTemplateCompetency } from '@/lib/job-types'
import type { RecruitmentRoundApiResponse } from '@/lib/hiring-types'

export class JobRoundTemplatesTransformer {
  /**
   * Transform UI hiring rounds to API job round templates request
   * 
   * @param rounds - The hiring rounds from UI
   * @param originalTemplates - Original API templates to compare for changes
   * @returns JobRoundTemplateBulkRequest
   */
  static transformRoundsToApiRequest(
    rounds: HiringRound[], 
    originalTemplates: RecruitmentRoundApiResponse[] = []
  ): JobRoundTemplateBulkRequest {
    const templates: JobRoundTemplateRequest[] = rounds.map((round, index) => {
      // Find original template if this round came from a template
      // First try to match by ID (exact match), then by name as fallback
      const originalTemplate = originalTemplates.find(template => 
        template.id === round.id
      ) || originalTemplates.find(template => 
        template.name === round.name
      )
      
      // Determine if this round is unchanged from original template
      const isUnchangedTemplate = originalTemplate && this.isRoundUnchanged(round, originalTemplate)
      
      // Transform competencies
      const customCompetencies: JobRoundTemplateCompetency[] = round.competencies.map(comp => ({
        name: comp.name,
        description: comp.description || '',
        rubric_scorecard: comp.rubricScorecard || this.questionsToRubricScorecard(comp.questions || [])
      }))

      const result = {
        round_id: isUnchangedTemplate ? originalTemplate.id : null,
        round_name: round.name,
        round_type: originalTemplate?.type || 'INTERVIEW', // Use template type or default to INTERVIEW
        order_index: index + 1,
        is_active: false, // Set to false initially as requested
        is_required: true, // Set to true as requested
        custom_evaluation_criteria: round.evaluationCriteria || undefined,
        custom_competencies: customCompetencies.length > 0 ? customCompetencies : undefined
      }
      
      console.log('Template result for round:', round.name, ':', {
        round_id: result.round_id,
        round_type: result.round_type,
        isUnchangedTemplate,
        originalTemplateId: originalTemplate?.id,
        originalTemplateType: originalTemplate?.type
      })
      
      return result
    })

    return { templates }
  }

  /**
   * Check if a hiring round is unchanged from its original template
   */
  private static isRoundUnchanged(round: HiringRound, originalTemplate: RecruitmentRoundApiResponse): boolean {
    console.log('Comparing round:', round.name, 'with template:', originalTemplate.name)
    
    // Check if basic properties match
    if (round.name !== originalTemplate.name) {
      console.log('Name mismatch:', round.name, '!==', originalTemplate.name)
      return false
    }
    
    // Allow null/undefined evaluation criteria to match empty string
    const roundCriteria = round.evaluationCriteria || ''
    const templateCriteria = originalTemplate.evaluation_criteria || ''
    if (roundCriteria !== templateCriteria) {
      console.log('Evaluation criteria mismatch:', roundCriteria, '!==', templateCriteria)
      return false
    }
    
    // Check if competencies match exactly
    if (round.competencies.length !== originalTemplate.competencies.length) {
      console.log('Competencies length mismatch:', round.competencies.length, '!==', originalTemplate.competencies.length)
      return false
    }
    
    // Sort competencies by name for consistent comparison
    const sortedUiComps = [...round.competencies].sort((a, b) => a.name.localeCompare(b.name))
    const sortedApiComps = [...originalTemplate.competencies].sort((a, b) => a.name.localeCompare(b.name))
    
    for (let i = 0; i < sortedUiComps.length; i++) {
      const uiComp = sortedUiComps[i]
      const apiComp = sortedApiComps[i]
      
      if (uiComp.name !== apiComp.name) {
        console.log('Competency name mismatch:', uiComp.name, '!==', apiComp.name)
        return false
      }
      
      const uiDescription = uiComp.description || ''
      const apiDescription = apiComp.description || ''
      if (uiDescription !== apiDescription) {
        console.log('Competency description mismatch:', uiDescription, '!==', apiDescription)
        return false
      }
      
      // Check if rubric scorecard matches
      const uiRubric = uiComp.rubricScorecard || this.questionsToRubricScorecard(uiComp.questions || [])
      const apiRubric = apiComp.rubric_scorecard || {}
      
      // Normalize both objects for comparison
      const normalizedUiRubric = JSON.stringify(uiRubric, Object.keys(uiRubric).sort())
      const normalizedApiRubric = JSON.stringify(apiRubric, Object.keys(apiRubric).sort())
      
      if (normalizedUiRubric !== normalizedApiRubric) {
        console.log('Rubric scorecard mismatch for competency:', uiComp.name)
        console.log('UI Rubric:', normalizedUiRubric)
        console.log('API Rubric:', normalizedApiRubric)
        return false
      }
    }
    
    console.log('Round is unchanged from template!')
    return true
  }

  /**
   * Convert questions array to rubric scorecard format
   */
  private static questionsToRubricScorecard(questions: Array<{ id: string; text: string }>): Record<string, string> {
    const rubric: Record<string, string> = {}
    questions.forEach((question, index) => {
      rubric[(index + 1).toString()] = question.text
    })
    return rubric
  }

  /**
   * Transform rounds with original template context for accurate comparison
   */
  static transformRoundsWithTemplateContext(
    rounds: HiringRound[],
    originalTemplates: RecruitmentRoundApiResponse[] = []
  ): JobRoundTemplateBulkRequest {
    return this.transformRoundsToApiRequest(rounds, originalTemplates)
  }

  /**
   * Simple transform without template context (for cases where we don't have original templates)
   */
  static transformRoundsSimple(rounds: HiringRound[]): JobRoundTemplateBulkRequest {
    return this.transformRoundsToApiRequest(rounds, [])
  }
}