export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ,
  CANDIDATES_BASE_URL: process.env.NEXT_PUBLIC_CANDIDATES_API_BASE_URL,
  ENDPOINTS: {
    JOB_TEMPLATES: '/job-templates',
    JOB_OPENINGS: '/job-openings',
    RECRUITMENT_ROUNDS: '/recruitment-rounds',
    JOB_ROUND_TEMPLATES: '/job-openings',
    JOB_CONFIRM: '/job-openings',
    AI_GENERATE_JOB: '/generate-job-description',
    // Job rounds management (BASE_URL)
    JOB_ROUND_TEMPLATES_GET: '/job-openings', // /{job_opening_id}/round-templates
    START_ROUNDS: '/job-openings', // /{job_opening_id}/start-rounds
    // Candidate endpoints (CANDIDATES_BASE_URL)
    CANDIDATES_BY_JOB: '/candidates/by-job',
    CANDIDATE_CREATE: '/candidate/create',
    CANDIDATES_BULK_CREATE: '/candidates/bulk-create',
    CANDIDATES_BULK_ROUND_STATUS_UPDATE: '/candidates/bulk-round-status-update',
    CANDIDATE_ROUNDS_BULK_CREATE: '/candidate-rounds/bulk-create'
  }
} as const