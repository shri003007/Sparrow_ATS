// API Response interfaces
export interface RecruitmentRoundCompetencyApiResponse {
  name: string
  description: string
  rubric_scorecard: Record<string, string>
}

export interface RecruitmentRoundApiResponse {
  id: string
  name: string
  type: string
  description: string
  is_default: boolean
  evaluation_criteria: string | null
  competencies: RecruitmentRoundCompetencyApiResponse[]
  created_at: string
  updated_at: string
}

export interface RecruitmentRoundsApiResponse {
  recruitment_rounds: RecruitmentRoundApiResponse[]
}

// UI interfaces (transformed from API)
export interface HiringRound {
  id: string
  name: string
  type: "preset" | "custom"
  isSelected: boolean
  order: number
  competencies: Competency[]
  description?: string
  duration?: string
  difficulty?: "Easy" | "Intermediate" | "Hard"
  evaluationCriteria: string // Added to the round level
}

export interface Competency {
  id: string
  name: string
  questions: Question[]
  focusAreas?: string[]
  description?: string
  rubricScorecard?: Record<string, string>
}

export interface Question {
  id: string
  text: string
}

export const presetRounds: HiringRound[] = [
  {
    id: "1",
    name: "Application Review",
    type: "preset",
    isSelected: false,
    order: 1,
    description: "Initial screening of applications to check for basic qualifications and alignment.",
    duration: "15-30 min",
    difficulty: "Easy",
    evaluationCriteria: "Assess based on experience relevance and skill alignment with the job description.",
    competencies: [
      {
        id: "comp-1-1",
        name: "Resume Screening",
        questions: [
          { id: "q-1-1", text: "Does the candidate meet the minimum experience requirements?" },
          { id: "q-1-2", text: "Are the required skills clearly demonstrated?" },
        ],
        focusAreas: ["Experience Match", "Skill Alignment"],
      },
    ],
  },
  {
    id: "2",
    name: "Phone Screen",
    type: "preset",
    isSelected: false,
    order: 2,
    description: "A brief call to assess communication skills, interest in the role, and cultural fit.",
    duration: "30-45 min",
    difficulty: "Easy",
    evaluationCriteria: "Evaluate clarity of thought, articulation, enthusiasm, and initial cultural alignment.",
    competencies: [
      {
        id: "comp-2-1",
        name: "Communication",
        questions: [
          { id: "q-2-1", text: "Tell me about yourself and your background." },
          { id: "q-2-2", text: "Why are you interested in this role?" },
        ],
        focusAreas: ["Verbal Communication", "Motivation", "Cultural Fit"],
      },
    ],
  },
  {
    id: "3",
    name: "Technical Interview",
    type: "preset",
    isSelected: false,
    order: 3,
    description: "In-depth technical assessment covering problem-solving, coding, and system design.",
    duration: "60-90 min",
    difficulty: "Intermediate",
    evaluationCriteria:
      "Assess analytical skills, approach to complex problems, code quality, and clarity of explanation.",
    competencies: [
      {
        id: "comp-3-1",
        name: "Problem Solving",
        questions: [
          { id: "q-3-1", text: "How would you design a URL shortening service?" },
          { id: "q-3-2", text: "Solve a given algorithmic challenge." },
        ],
        focusAreas: ["Algorithm Design", "Data Structures", "System Design"],
      },
      {
        id: "comp-3-2",
        name: "Coding Proficiency",
        questions: [{ id: "q-3-3", text: "Implement a function to reverse a linked list." }],
        focusAreas: ["Code Readability", "Efficiency", "Best Practices"],
      },
    ],
  },
  {
    id: "4",
    name: "Hiring Manager Interview",
    type: "preset",
    isSelected: false,
    order: 4,
    description: "Discussion with the hiring manager to evaluate team fit, leadership, and strategic thinking.",
    duration: "45-60 min",
    difficulty: "Intermediate",
    evaluationCriteria:
      "Evaluate leadership potential, collaboration skills, and alignment with team dynamics and strategic goals.",
    competencies: [
      {
        id: "comp-4-1",
        name: "Leadership & Team Fit",
        questions: [
          { id: "q-4-1", text: "Describe a time when you led a challenging project." },
          { id: "q-4-2", text: "How do you handle conflicts within your team?" },
        ],
        focusAreas: ["Project Leadership", "Conflict Resolution", "Teamwork"],
      },
    ],
  },
  {
    id: "5",
    name: "On-site Interview",
    type: "preset",
    isSelected: false,
    order: 5,
    description: "A series of interviews with team members to assess cultural fit and collaboration.",
    duration: "2-4 hours",
    difficulty: "Hard",
    evaluationCriteria:
      "Assess alignment with company culture, values, and ability to collaborate effectively with multiple team members.",
    competencies: [
      {
        id: "comp-5-1",
        name: "Cultural Fit & Collaboration",
        questions: [
          { id: "q-5-1", text: "How do you handle working in a fast-paced environment?" },
          { id: "q-5-2", text: "What motivates you in your work?" },
        ],
        focusAreas: ["Adaptability", "Motivation", "Collaboration"],
      },
    ],
  },
]
