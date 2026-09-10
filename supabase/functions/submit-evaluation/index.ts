// Supabase Edge Function: Submit Evaluation (HR Only)
// Handles HR evaluation submission with service role access

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
      throw new Error('Unauthorized: Only HR users can submit evaluations')
    }

    const {
      candidate_id,
      interview_id,
      overall_score,
      recommendation,
      notes,
      category_scores
    } = await req.json()

    // Validate required fields
    if (!candidate_id || !overall_score || !recommendation) {
      throw new Error('Missing required fields: candidate_id, overall_score, recommendation')
    }

    // Validate overall_score range
    if (overall_score < 0 || overall_score > 100) {
      throw new Error('Overall score must be between 0 and 100')
    }

    // Validate recommendation
    const validRecommendations = ['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE']
    if (!validRecommendations.includes(recommendation)) {
      throw new Error(`Invalid recommendation. Must be one of: ${validRecommendations.join(', ')}`)
    }

    // Create evaluation
    const { data: evaluation, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .insert({
        candidate_id,
        interview_id: interview_id || null,
        evaluator_id: user.id,
        overall_score,
        recommendation,
        notes: notes || null,
        evaluated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (evalError) throw evalError

    // Insert category scores if provided
    if (category_scores && Array.isArray(category_scores)) {
      const scoresToInsert = category_scores.map((score: any) => ({
        evaluation_id: evaluation.id,
        category_id: score.category_id,
        score: score.score,
        notes: score.notes || null
      }))

      const { error: scoresError } = await supabaseAdmin
        .from('evaluation_scores')
        .insert(scoresToInsert)

      if (scoresError) throw scoresError
    }

    // Update candidate status to EVALUATED
    await supabaseAdmin
      .from('candidates')
      .update({ status: 'EVALUATED' })
      .eq('id', candidate_id)

    // Update application status if exists
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('candidate_id', candidate_id)
      .eq('status', 'INTERVIEW_COMPLETED')
      .single()

    if (application) {
      await supabaseAdmin
        .from('applications')
        .update({ status: 'EVALUATED' })
        .eq('id', application.id)
    }

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'evaluation_submitted',
        entity_type: 'evaluation',
        entity_id: evaluation.id,
        metadata: {
          candidate_id,
          overall_score,
          recommendation
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        evaluation,
        message: 'Evaluation submitted successfully'
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
