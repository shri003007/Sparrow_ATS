export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ,
  CANDIDATES_BASE_URL: process.env.NEXT_PUBLIC_CANDIDATES_API_BASE_URL,
  // Candidate Dashboard API
  CANDIDATES_DASHBOARD_BASE_URL: process.env.NEXT_PUBLIC_CANDIDATES_DASHBOARD,
  // All Views Management API
  ALL_VIEWS_API_URL: process.env.NEXT_PUBLIC_ALL_VIEWS_API_URL,
  // AI Evaluation APIs
  RESUME_EVALUATION_API_URL: process.env.NEXT_PUBLIC_RESUME_EVALUATION_URL,
  CANDIDATE_EVALUATION_API_URL: process.env.NEXT_PUBLIC_CANDIDATE_EVALUATION_URL,
  // Project Asset Management API
  CANDIDATE_PROJECT_ASSETS_API_URL: process.env.NEXT_PUBLIC_CANDIDATE_PROJECT_ASSETS,
  // Project Evaluation API
  CANDIDATE_PROJECT_EVALUATION_API_URL: process.env.NEXT_PUBLIC_CANDIDATE_PROJECT_EVALUATION_URL,
  // Sparrow Interviewer Evaluation API
  CANDIDATE_EVALUATION_FROM_SPARROWINTERVIEWER_URL: process.env.NEXT_PUBLIC_CANDIDATE_EVALUATION_FROM_SPARROWINTERVIEWER_URL,
  // Sales Evaluation API
  SALES_EVALUATION_FROM_SPARROWINTERVIEWER_URL: process.env.NEXT_PUBLIC_SALES_EVALUATION_FROM_SPARROWINTERVIEWER_URL,
  // Sparrow Assessment Get Answers API
  GET_ANSWERS_API_URL: process.env.NEXT_PUBLIC_GET_ANSWERS,
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
    // User management endpoints (BASE_URL)
    USERS: '/users',
    // Candidate endpoints (CANDIDATES_BASE_URL)
    CANDIDATES_BY_JOB: '/candidates/by-job',
    CANDIDATE_CREATE: '/candidate/create',
    CANDIDATES_BULK_CREATE: '/candidates/bulk-create',
    CANDIDATES_BULK_ROUND_STATUS_UPDATE: '/candidates/bulk-round-status-update',
    UPDATE_CANDIDATE_ROUND_STATUS: '/update-candidate-round-status',
    CANDIDATE_ROUNDS_BULK_CREATE: '/candidate-rounds/bulk-create',
    // AI Evaluation endpoints
    RESUME_EVALUATION: '/evaluate' // This will be appended to RESUME_EVALUATION_API_URL
  }
} as const