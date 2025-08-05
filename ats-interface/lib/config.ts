export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ,
  ENDPOINTS: {
    JOB_TEMPLATES: '/job-templates',
    JOB_OPENINGS: '/job-openings',
    RECRUITMENT_ROUNDS: '/recruitment-rounds',
    JOB_ROUND_TEMPLATES: '/job-openings',
    JOB_CONFIRM: '/job-openings',
    AI_GENERATE_JOB: '/generate-job-description'
  }
} as const