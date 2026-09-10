# Supabase Edge Functions - Backend API

This directory contains all serverless Edge Functions that handle backend operations for TalentGate.

## Architecture Overview

```
Frontend (React) → Edge Functions → Supabase (PostgreSQL + Storage)
     ↓                    ↓                    ↓
  User UI          Business Logic        Data Storage
```

## Edge Functions

### 1. `candidate-register`
**Purpose:** Register new candidates with validation and role assignment

**Request:**
```json
{
  "email": "candidate@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "mobile": "+1234567890",
  "city": "New York",
  "cnic": "12345-6789012-3",
  "position_id": "uuid-optional"
}
```

**Response:**
```json
{
  "success": true,
  "candidate": { ... },
  "message": "Candidate registered successfully"
}
```

**Security:**
- Validates CNIC format
- Generates unique reference code
- Assigns CANDIDATE role automatically
- Creates audit log entry

---

### 2. `upload-file`
**Purpose:** Upload CV or profile photo to private storage

**Request:** (FormData)
- `file`: File object
- `file_type`: 'cv' | 'profile_photo'

**Response:**
```json
{
  "success": true,
  "file_path": "user-id/cv/1234567890.pdf",
  "candidate": { ... },
  "message": "File uploaded successfully"
}
```

**Security:**
- Validates file type (PDF/DOC/DOCX for CV, JPEG/PNG/WEBP for photos)
- Enforces size limits (10MB CV, 5MB photo)
- Verifies user ownership
- Updates candidate record

---

### 3. `upload-recording`
**Purpose:** Upload interview video/audio recordings

**Request:** (FormData)
- `file`: Video/audio file
- `interview_question_id`: UUID
- `attempt_number`: Number

**Response:**
```json
{
  "success": true,
  "recording": { ... },
  "message": "Recording uploaded successfully"
}
```

**Security:**
- Validates file type (webm/mp4/mpeg)
- Enforces 200MB size limit
- Verifies candidate owns the interview
- Validates attempt number
- Updates interview question status

---

### 4. `submit-interview`
**Purpose:** Finalize interview submission

**Request:**
```json
{
  "interview_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "interview": { ... },
  "message": "Interview submitted successfully"
}
```

**Security:**
- Verifies candidate ownership
- Checks all required questions answered
- Updates interview and candidate status
- Creates audit log

---

### 5. `submit-evaluation`
**Purpose:** HR submits candidate evaluation

**Request:**
```json
{
  "candidate_id": "uuid",
  "interview_id": "uuid-optional",
  "overall_score": 85,
  "recommendation": "HIRE",
  "notes": "Strong technical skills",
  "category_scores": [
    {
      "category_id": "uuid",
      "score": 90,
      "notes": "Excellent communication"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "evaluation": { ... },
  "message": "Evaluation submitted successfully"
}
```

**Security:**
- Requires HR role
- Validates score ranges
- Updates candidate status
- Creates audit log

---

### 6. `update-candidate-status`
**Purpose:** HR updates candidate pipeline status

**Request:**
```json
{
  "candidate_id": "uuid",
  "status": "INTERVIEW_SCHEDULED",
  "notes": "Scheduled for technical interview"
}
```

**Response:**
```json
{
  "success": true,
  "candidate": { ... },
  "message": "Candidate status updated successfully"
}
```

**Security:**
- Requires HR role
- Validates status values
- Creates status history entry
- Creates audit log

---

### 7. `get-signed-url`
**Purpose:** Generate temporary signed URLs for private files

**Request:**
```json
{
  "bucket": "candidate-cvs",
  "file_path": "user-id/cv/file.pdf",
  "expires_in": 3600
}
```

**Response:**
```json
{
  "success": true,
  "signed_url": "https://...",
  "expires_in": 3600,
  "message": "Signed URL generated successfully"
}
```

**Security:**
- Requires HR role
- Validates bucket name
- Logs access for audit

---

### 8. `get-recording-playback`
**Purpose:** Generate signed URL for recording playback

**Request:**
```json
{
  "recording_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "playback_url": "https://...",
  "recording": {
    "id": "uuid",
    "candidate_name": "John Doe",
    "reference_code": "CND-ABC123"
  },
  "expires_in": 3600,
  "message": "Playback URL generated successfully"
}
```

**Security:**
- Requires HR role
- 1-hour expiration
- Logs access with candidate details

---

## Deployment

### Prerequisites
1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref khaxdoosuzzanardcnjx
```

### Deploy All Functions
```bash
# Deploy each function
supabase functions deploy candidate-register
supabase functions deploy upload-file
supabase functions deploy upload-recording
supabase functions deploy submit-interview
supabase functions deploy submit-evaluation
supabase functions deploy update-candidate-status
supabase functions deploy get-signed-url
supabase functions deploy get-recording-playback
```

### Deploy Single Function
```bash
supabase functions deploy <function-name>
```

### Set Environment Variables
```bash
# In Supabase Dashboard → Edge Functions → Secrets
# Or via CLI:
supabase secrets set SUPABASE_URL=https://khaxdoosuzzanardcnjx.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ IMPORTANT:** Never commit service role key to git!

---

## Local Development

### Run Functions Locally
```bash
# Start all functions
supabase functions serve

# Start single function
supabase functions serve candidate-register
```

### Test Locally
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/candidate-register' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "mobile": "+1234567890",
    "city": "Test City",
    "cnic": "12345-6789012-3"
  }'
```

---

## Security Model

### Authentication Flow
```
1. User authenticates via Supabase Auth
2. Frontend receives JWT token
3. Edge Function verifies JWT
4. Function checks user role in database
5. Operation executes with service role (if authorized)
```

### Role-Based Access Control
- **CANDIDATE:** Can register, upload files, submit interviews
- **HR:** Can evaluate, update status, access recordings

### Audit Trail
Every operation creates an audit log entry with:
- User ID
- Action performed
- Entity affected
- Metadata (changes, file paths, etc.)

---

## Error Handling

All functions return consistent error format:
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

Common errors:
- `Unauthorized` - Missing or invalid auth token
- `Missing required fields` - Validation failed
- `Invalid file type` - File validation failed
- `File too large` - Size limit exceeded
- `Unauthorized: Only HR users...` - Role check failed

---

## Frontend Integration

Use the provided API client:

```typescript
import { backendAPI } from '@/lib/backend-api'

// Register candidate
const result = await backendAPI.registerCandidate({
  email: 'user@example.com',
  password: 'password123',
  full_name: 'John Doe',
  mobile: '+1234567890',
  city: 'New York',
  cnic: '12345-6789012-3'
})

if (result.success) {
  console.log('Registered:', result.data)
} else {
  console.error('Error:', result.error)
}

// Upload file
const fileInput = document.querySelector('input[type=file]')
const file = fileInput.files[0]
const uploadResult = await backendAPI.uploadFile(file, 'cv')

// Get recording playback (HR only)
const playback = await backendAPI.getRecordingPlayback(recordingId)
if (playback.success) {
  videoElement.src = playback.data.playback_url
}
```

---

## Monitoring & Logs

View function logs in Supabase Dashboard:
- Edge Functions → Logs
- Filter by function name
- View request/response details
- Monitor error rates

---

## Cost Considerations

Supabase Edge Functions pricing:
- Free tier: 500,000 invocations/month
- Paid: $0.000004 per invocation

Optimize by:
- Caching responses where possible
- Batching operations
- Using appropriate expiration times for signed URLs

---

## Troubleshooting

### Function not found
```bash
# Check deployed functions
supabase functions list

# Redeploy
supabase functions deploy <function-name>
```

### CORS errors
- Ensure `corsHeaders` are set in all functions
- Check frontend is using correct Supabase URL

### Authentication errors
- Verify JWT token is being sent
- Check token hasn't expired
- Verify Supabase Auth is configured correctly

### Permission denied
- Check user has correct role in `user_roles` table
- Verify RLS policies allow the operation
- Check service role key is set in secrets

---

## Next Steps

1. Deploy all functions to production
2. Set environment variables
3. Test each function with frontend
4. Monitor logs for errors
5. Optimize based on usage patterns
