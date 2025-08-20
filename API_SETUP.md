# API Integration Setup

## Environment Configuration

Create a `.env.local` file in the root of the `ats-interface` directory with the following content:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## API Endpoints

### Job Templates
- **GET** `/job-templates` - Fetch all job templates

### Job Openings
- **POST** `/job-openings` - Create a new job opening
- **PUT** `/job-openings/{id}` - Update an existing job opening

### Recruitment Rounds
- **GET** `/recruitment-rounds` - Fetch all recruitment round templates

### Example Usage

```bash
# Get job templates
curl --location 'http://127.0.0.1:8000/job-templates' \
--data ''

# Create job opening
curl --location 'http://127.0.0.1:8000/job-openings' \
--header 'Content-Type: application/json' \
--data '{
  "posting_title": "Digital Marketing Manager",
  "custom_job_description": "Job description here...",
  "employment_type": "full_time",
  "minimum_experience": "5+ years",
  "compensation_type": "salary",
  "compensation_value": 120000.0,
  "compensation_currency": "INR",
  "created_by": "6693120e-31e2-4727-92c0-3606885e7e9e",
  "expires_at": "2025-08-31T23:59:59Z"
}'

# Update job opening
curl --location 'http://127.0.0.1:8000/job-openings/{job-id}' \
--header 'Content-Type: application/json' \
--data '{
  "posting_title": "Updated Title",
  "compensation_value": 130000.0
}'
```

## File Structure

- `lib/config.ts` - API configuration and endpoints
- `lib/api/job-templates.ts` - API service for job templates
- `lib/api/job-openings.ts` - API service for job opening CRUD operations
- `lib/transformers/job-template-transformer.ts` - Data transformation utilities for templates
- `lib/transformers/job-opening-transformer.ts` - Data transformation utilities for job openings
- `lib/job-types.ts` - TypeScript interfaces for API and UI data

## API Response Format

The job templates API returns data in the following format:

```json
{
  "job_templates": [
    {
      "id": "string",
      "title": "string",
      "job_description": "string",
      "employment_type": "full_time|part_time|contract|internship|freelance",
      "minimum_experience": "string",
      "compensation_type": "salary",
      "compensation_value": number,
      "compensation_currency": "INR|USD|EUR",
      "created_by": "string",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

## Job Opening API Response Format

The job openings API returns data in the following format:

```json
{
  "message": "Job opening created successfully",
  "job_opening": {
    "id": "string",
    "posting_title": "string",
    "custom_job_description": "string",
    "job_status": "draft|active|paused|closed",
    "employment_type": "full_time|part_time|contract|freelance",
    "minimum_experience": "string",
    "compensation_type": "salary|hourly",
    "compensation_value": number,
    "compensation_currency": "INR|USD|EUR",
    "created_by": "string",
    "created_at": "string",
    "updated_at": "string",
    "published_at": "string|null",
    "expires_at": "string|null"
  }
}
```

## Data Transformation

The API data is automatically transformed to match the UI requirements:

### Templates:
- Employment types are converted to readable format
- Compensation is formatted with currency symbols and LPA conversion for INR
- Job descriptions are parsed to extract summaries and responsibilities
- Bullet points and key phrases are extracted for the responsibilities section

### Job Openings:
- Form data is transformed to API format with proper field mapping
- Employment types are converted between UI format ("Full-time") and API format ("full_time")
- Compensation types are mapped between UI ("Salary Range") and API ("salary") formats
- Compensation values are parsed from formatted strings to numbers for API calls

## Job Round Templates API

### Create Job Round Templates (Bulk)
**Endpoint**: `POST /job-openings/{job_opening_id}/round-templates/bulk`

**Description**: Creates multiple job round templates at once for a specific job opening.

**Request Body**:
```json
{
  "templates": [
    {
      "round_id": "optional-template-id-or-null",
      "round_name": "Technical Interview Round",
      "round_type": "INTERVIEW",
      "order_index": 1,
      "is_active": false,
      "is_required": true,
      "custom_evaluation_criteria": "Technical assessment focusing on coding skills",
      "custom_competencies": [
        {
          "name": "Python Programming",
          "description": "Assess Python coding skills",
          "rubric_scorecard": {
            "1": "Did the candidate write clean, readable Python code?",
            "2": "Did the candidate use appropriate data structures?",
            "3": "Did the candidate handle errors appropriately?"
          }
        }
      ]
    }
  ]
}
```

**Response**:
```json
{
  "message": "Successfully created 3 job round templates",
  "job_round_templates": [
    {
      "id": "012e3456-e78f-90g1-h234-567890123456",
      "job_opening_id": "456e7890-e12c-34d5-b678-123456789000",
      "round_id": "789e0123-e45f-67g8-h901-234567890123",
      "round_name": "Technical Interview Round",
      "round_type": "INTERVIEW",
      "order_index": 1,
      "is_active": false,
      "is_required": true,
      "custom_evaluation_criteria": "Technical assessment...",
      "custom_competencies": [...],
      "created_at": "2024-01-15T10:40:00Z"
    }
  ],
  "job_opening_id": "456e7890-e12c-34d5-b678-123456789000"
}
```

### Key Implementation Details:
- `round_id`: Include only if round is unchanged from original template
- `is_active`: Set to `false` initially as requested
- `is_required`: Set to `true` as requested  
- `order_index`: Sequential numbering based on round order (1, 2, 3...)
- `round_type`: Defaults to "INTERVIEW" for new rounds, uses template type for existing rounds

## Job Confirmation API

### Confirm Job Opening
**Endpoint**: `POST /job-openings/{job_opening_id}/confirm`

**Description**: Confirms and publishes a job opening by setting status to 'active' and updating the published_at timestamp to current time.

**Request**: No request body required.

**Response**:
```json
{
  "message": "Job opening confirmed and published successfully",
  "job_opening": {
    "id": "456e7890-e12c-34d5-b678-123456789000",
    "posting_title": "Senior Data Scientist - Remote Team",
    "job_status": "active",
    "employment_type": "full_time",
    "minimum_experience": "6+ years",
    "compensation_type": "salary",
    "compensation_value": 150000,
    "compensation_currency": "INR",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "published_at": "2024-01-15T10:30:00Z",
    "expires_at": "2024-12-31T23:59:59Z"
  },
  "previous_status": "draft",
  "new_status": "active",
  "published_at": "2024-01-15T10:30:00Z"
}
```

### Key Features:
- **Automatic Status Change**: Changes job status from 'draft' to 'active'
- **Timestamp Setting**: Sets `published_at` to current time
- **Idempotent**: Safe to call multiple times (returns current data if already active)
- **Audit Trail**: Returns both previous and new status for tracking

## AI Job Generation API

### Generate Job Description
**Endpoint**: `POST /generate-job-description`

**Description**: Generates a complete job description using AI based on user input.

**Request Body**:
```json
{
  "user_input": "We need a Senior Frontend Developer with React and TypeScript experience to work on our e-commerce platform",
  "created_by": "6693120e-31e2-4727-92c0-3606885e7e9e"
}
```

**Response** (Success):
```json
{
  "success": true,
  "is_valid": true,
  "job_template": {
    "success": true,
    "is_valid": true,
    "title": "Senior Frontend Developer",
    "job_description": "**Job Overview:**\nWe are seeking an experienced Senior Frontend Developer...",
    "created_by": "6693120e-31e2-4727-92c0-3606885e7e9e",
    "created_at": "2025-08-04T12:56:44.737073",
    "updated_at": "2025-08-04T12:56:44.737073",
    "employment_type": "full_time",
    "minimum_experience": "5+ years",
    "compensation_type": "salary",
    "compensation_value": 1500000.0,
    "compensation_currency": "INR"
  },
  "message": "Job description generated successfully",
  "generation_info": {
    "model_used": "anthropic.claude-3-5-haiku-20241022-v1:0",
    "input_tokens": 676,
    "output_tokens": 348,
    "reason": "Input provides clear job role, technology requirements, and context"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "Code": "BadRequestError",
  "Message": "Validation error: User input cannot be empty"
}
```

**Error Response** (500 Internal Server Error):
```json
{
  "success": false,
  "is_valid": false,
  "error": "LLM call failed: Access denied to model",
  "reason": "AI service unavailable"
}
```

### Key Features:
- **AI-Powered Generation**: Uses advanced language models for intelligent job description creation
- **Complete Job Data**: Returns title, description, employment type, experience, compensation
- **Token Tracking**: Provides input/output token usage for monitoring
- **Error Handling**: Clear error messages for validation and service issues
- **Automatic Formatting**: Job descriptions include proper markdown formatting

### Error Handling Implementation:

#### Frontend Error Handling:
```typescript
// Proper error handling for AI responses
if (response.success && response.is_valid) {
  // Success: AI generated valid job description
  const formData = AIJobTransformer.transformToFormData(response.job_template)
  setJobFormData(formData)
  navigateToJobForm()
} else {
  // Expected error: Show user-friendly message from AI
  const errorMessage = response.reason || response.error
  showUserError(`AI Generation Failed: ${errorMessage}`)
}
```

#### Common Error Scenarios:
1. **Vague Input**: "hi", "hello", "job" → 
   ```json
   {
     "success": false,
     "is_valid": false,
     "error": "Input validation failed",
     "reason": "Input is too vague and does not provide any job-related context..."
   }
   ```

2. **Empty Input**: "" → 
   ```json
   {
     "Code": "BadRequestError",
     "Message": "Validation error: User input cannot be empty"
   }
   ```

3. **AI Service Issues**: →
   ```json
   {
     "success": false,
     "is_valid": false, 
     "error": "LLM call failed: Access denied to model",
     "reason": "AI service unavailable"
   }
   ```

#### Response Validation:
- **Success**: `success: true` AND `is_valid: true` AND `job_template` exists
- **User Error**: `success: false` OR `is_valid: false` → Show `reason` field to user
- **Technical Error**: Network/HTTP errors → Show generic technical error message