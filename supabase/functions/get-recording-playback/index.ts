// Supabase Edge Function: Get Recording Playback URL
// Generates signed URL for HR to view candidate recordings

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

    // Verify user has HR role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select(`
        role_id,
        roles (
          name
        )
      `)
      .eq('user_id', user.id)

    const hasHRRole = userRoles?.some(ur => ur.roles.name === 'HR')
    if (!hasHRRole) {
      throw new Error('Unauthorized: Only HR users can access recordings')
    }

    const { recording_id } = await req.json()

    if (!recording_id) {
      throw new Error('Missing required field: recording_id')
    }

    // Get recording details
    const { data: recording, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .select(`
        id,
        storage_path,
        candidate_id,
        interview_question_id,
        candidates (
          full_name,
          reference_code
        )
      `)
      .eq('id', recording_id)
      .single()

    if (recordingError || !recording) {
      throw new Error('Recording not found')
    }

    // Generate signed URL (1 hour expiration)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('interview-recordings')
      .createSignedUrl(recording.storage_path, 3600)

    if (signedUrlError) throw signedUrlError

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'recording_accessed',
        entity_type: 'recording',
        entity_id: recording_id,
        metadata: {
          candidate_id: recording.candidate_id,
          candidate_name: recording.candidates.full_name,
          reference_code: recording.candidates.reference_code
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        playback_url: signedUrlData.signedUrl,
        recording: {
          id: recording.id,
          candidate_name: recording.candidates.full_name,
          reference_code: recording.candidates.reference_code
        },
        expires_in: 3600,
        message: 'Playback URL generated successfully'
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
