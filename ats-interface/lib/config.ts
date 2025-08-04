export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ,
  ENDPOINTS: {
    JOB_TEMPLATES: '/job-templates',
    JOB_OPENINGS: '/job-openings'
  }
} as const