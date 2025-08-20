export interface Candidate {
  id: string
  name: string
  recommendation: {
    type: "highly" | "good" | "needs"
    label: string
    score: number
    maxScore: number
  }
  status: string
  experience: string
  skills?: string[]
  company?: string
  email?: string
  phone?: string
  socials?: {
    linkedin?: string
    twitter?: string
  }
  resume?: string
  addedOn?: string
}

export interface JobRole {
  id: string
  title: string
  applicantCount: number
  openedDate: string
  isActive: boolean
}
