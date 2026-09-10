# Backend Deployment Quick Start

## Overview

The TalentGate backend consists of 8 Supabase Edge Functions that handle all server-side operations securely.

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Logged in to Supabase**
   ```bash
   supabase login
   ```

3. **Project linked**
   ```bash
   supabase link --project-ref khaxdoosuzzanardcnjx
   ```

## Step 1: Set Environment Variables

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```
SUPABASE_URL=https://khaxdoosuzzanardcnjx.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**⚠️ IMPORTANT:** 
- `SUPABASE_ANON_KEY` is public (safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` is SECRET (never expose to frontend!)

## Step 2: Deploy Edge Functions

### Option A: Use Deployment Script (Recommended)
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

### Option B: Manual Deployment
```bash
cd supabase/functions

# Deploy each function
supabase functions deploy candidate-register --no-verify-jwt
supabase functions deploy upload-file --no-verify-jwt
supabase functions deploy upload-recording --no-verify-jwt
supabase functions deploy submit-interview --no-verify-jwt
supabase functions deploy submit-evaluation --no-verify-jwt
supabase functions deploy update-candidate-status --no-verify-jwt
supabase functions deploy get-signed-url --no-verify-jwt
supabase functions deploy get-recording-playback --no-verify-jwt
```

## Step 3: Verify Deployment

Check deployed functions:
```bash
supabase functions list
```

Expected output:
```
NAME                    VERSION  STATUS
candidate-register      1        ACTIVE
upload-file             1        ACTIVE
upload-recording        1        ACTIVE
submit-interview        1        ACTIVE
submit-evaluation       1        ACTIVE
update-candidate-status 1        ACTIVE
get-signed-url          1        ACTIVE
get-recording-playback  1        ACTIVE
```

## Step 4: Test the Backend

### Test Candidate Registration
```bash
curl -X POST https://khaxdoosuzzanardcnjx.supabase.co/functions/v1/candidate-register \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
    "mobile": "+1234567890",
    "city": "Test City",
    "cnic": "12345-6789012-3"
  }'
```

Expected response:
```json
{
  "success": true,
  "candidate": { ... },
  "message": "Candidate registered successfully"
}
```

## Step 5: Update Frontend

The frontend API client is already configured at `src/lib/backend-api.ts`.

Update your components to use it:

```typescript
import { backendAPI } from '@/lib/backend-api'

// Example: Register candidate
const handleRegister = async (formData: RegisterFormData) => {
  const result = await backendAPI.registerCandidate(formData)
  
  if (result.success) {
    console.log('Success:', result.data)
  } else {
    console.error('Error:', result.error)
  }
}

// Example: Upload CV
const handleUploadCV = async (file: File) => {
  const result = await backendAPI.uploadFile(file, 'cv')
  
  if (result.success) {
    console.log('File uploaded:', result.data.file_path)
  } else {
    console.error('Upload failed:', result.error)
  }
}

// Example: Get recording playback (HR only)
const handlePlayRecording = async (recordingId: string) => {
  const result = await backendAPI.getRecordingPlayback(recordingId)
  
  if (result.success) {
    videoRef.current.src = result.data.playback_url
  } else {
    console.error('Playback failed:', result.error)
  }
}
```

## Step 6: Monitor & Debug

### View Logs
Go to Supabase Dashboard → Edge Functions → Logs

### Common Issues

**Issue: Function not found**
```bash
# Redeploy the function
supabase functions deploy <function-name> --no-verify-jwt
```

**Issue: Authentication failed**
- Check `SUPABASE_ANON_KEY` is correct
- Verify user is authenticated
- Check JWT token is being sent

**Issue: Permission denied**
- Verify user has correct role in `user_roles` table
- Check RLS policies allow the operation
- For HR operations, verify user has HR role

**Issue: CORS errors**
- Ensure all functions have `corsHeaders` configured
- Check frontend is using correct Supabase URL

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       │ HTTP Request
       │ (JWT Token)
       ▼
┌─────────────────────┐
│  Edge Functions     │
│  ─────────────────  │
│  • candidate-register│
│  • upload-file      │
│  • upload-recording │
│  • submit-interview │
│  • submit-evaluation│
│  • update-status    │
│  • get-signed-url   │
│  • get-playback     │
└──────┬──────────────┘
       │
       │ Service Role
       │ (Admin Access)
       ▼
┌─────────────────────┐
│    Supabase         │
│  ─────────────────  │
│  • PostgreSQL       │
│  • Storage          │
│  • Auth             │
│  • RLS Policies     │
└─────────────────────┘
```

## Security Model

1. **Authentication**: All requests require valid JWT token
2. **Authorization**: Functions check user roles before operations
3. **Service Role**: Edge Functions use service role for admin operations
4. **Audit Trail**: All operations logged to `audit_logs` table
5. **RLS**: Database-level security as additional layer

## Cost & Limits

- **Free Tier**: 500,000 invocations/month
- **Paid**: $0.000004 per invocation
- **Execution Time**: Max 60 seconds per function
- **Memory**: 128MB per function

## Next Steps

1. ✅ Deploy all Edge Functions
2. ✅ Set environment variables
3. ✅ Test each function
4. ✅ Update frontend components
5. ✅ Monitor logs for errors
6. ✅ Optimize based on usage

## Support

- **Documentation**: `supabase/functions/README.md`
- **API Client**: `src/lib/backend-api.ts`
- **Logs**: Supabase Dashboard → Edge Functions → Logs

---

**🎉 Backend is ready! Your Edge Functions are deployed and secured.**
