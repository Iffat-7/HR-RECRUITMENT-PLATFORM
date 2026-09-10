// Supabase Edge Function: Interview Recording Upload
// Handles secure upload of video/audio recordings to private storage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const interviewQuestionId = formData.get('interview_question_id') as string
    const attemptNumber = parseInt(formData.get('attempt_number') as string)

    if (!file || !interviewQuestionId || !attemptNumber) {
      throw new Error('Missing required fields: file, interview_question_id, attempt_number')
    }

    // Verify file type
    const allowedTypes = ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4', 'audio/mpeg']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: webm, mp4, mpeg')
    }

    // Verify file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      throw new Error('File too large. Maximum size: 200MB')
    }

    // Verify candidate owns this interview question
    const { data: interviewQuestion, error: iqError } = await supabaseAdmin
      .from('interview_questions')
      .select(`
        id,
        interview_id,
        interviews!inner (
          candidate_id,
          candidates!inner (
            id
          )
        )
      `)
      .eq('id', interviewQuestionId)
      .single()

    if (iqError || !interviewQuestion) {
      throw new Error('Interview question not found')
    }

    const candidateId = interviewQuestion.interviews.candidate_id

    // Verify the candidate is the current user
    if (candidateId !== user.id) {
      throw new Error('Unauthorized: You can only upload recordings for your own interviews')
    }

    // Verify attempt number is valid
    const { data: existingRecordings, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('attempt_number')
      .eq('interview_question_id', interviewQuestionId)
      .eq('status', 'UPLOADED')

    if (recError) throw recError

    const maxAttempts = existingRecordings.length + 1
    if (attemptNumber > maxAttempts) {
      throw new Error(`Invalid attempt number. Maximum allowed: ${maxAttempts}`)
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${candidateId}/${interviewQuestionId}/${attemptNumber}-${Date.now()}.${fileExt}`

    // Upload to storage
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('interview-recordings')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (storageError) throw storageError

    // Create recording record
    const { data: recordingData, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .insert({
        interview_question_id: interviewQuestionId,
        candidate_id: candidateId,
        storage_path: fileName,
        file_type: file.type.startsWith('video') ? 'VIDEO' : 'AUDIO',
        file_size: file.size,
        duration_seconds: null, // Will be updated after processing
        attempt_number: attemptNumber,
        status: 'UPLOADED',
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (recordingError) throw recordingError

    // Update interview question status
    await supabaseAdmin
      .from('interview_questions')
      .update({ status: 'ANSWERED' })
      .eq('id', interviewQuestionId)

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'recording_uploaded',
        entity_type: 'recording',
        entity_id: recordingData.id,
        metadata: {
          interview_question_id: interviewQuestionId,
          attempt_number: attemptNumber,
          file_size: file.size,
          file_type: recordingData.file_type
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        recording: recordingData,
        message: 'Recording uploaded successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
