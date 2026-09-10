// Supabase Edge Function: Submit Interview
// Handles final interview submission and status updates

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

    const { interview_id } = await req.json()

    if (!interview_id) {
      throw new Error('Missing required field: interview_id')
    }

    // Verify candidate owns this interview
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from('interviews')
      .select(`
        id,
        candidate_id,
        status,
        interview_questions (
          id,
          status,
          is_required
        )
      `)
      .eq('id', interview_id)
      .single()

    if (interviewError || !interview) {
      throw new Error('Interview not found')
    }

    // Verify the candidate is the current user
    if (interview.candidate_id !== user.id) {
      throw new Error('Unauthorized: You can only submit your own interviews')
    }

    // Check if interview is already submitted
    if (interview.status === 'SUBMITTED') {
      throw new Error('Interview already submitted')
    }

    // Verify all required questions are answered
    const requiredQuestions = interview.interview_questions.filter(q => q.is_required)
    const unansweredRequired = requiredQuestions.filter(q => q.status !== 'ANSWERED')

    if (unansweredRequired.length > 0) {
      throw new Error(`Cannot submit: ${unansweredRequired.length} required question(s) not answered`)
    }

    // Update interview status
    const { data: updatedInterview, error: updateError } = await supabaseAdmin
      .from('interviews')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString()
      })
      .eq('id', interview_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Update candidate status
    await supabaseAdmin
      .from('candidates')
      .update({ status: 'INTERVIEW_COMPLETED' })
      .eq('id', user.id)

    // Update application status if exists
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('candidate_id', user.id)
      .eq('status', 'INTERVIEW_SCHEDULED')
      .single()

    if (application) {
      await supabaseAdmin
        .from('applications')
        .update({ status: 'INTERVIEW_COMPLETED' })
        .eq('id', application.id)
    }

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'interview_submitted',
        entity_type: 'interview',
        entity_id: interview_id,
        metadata: {
          total_questions: interview.interview_questions.length,
          required_questions: requiredQuestions.length
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        interview: updatedInterview,
        message: 'Interview submitted successfully'
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
