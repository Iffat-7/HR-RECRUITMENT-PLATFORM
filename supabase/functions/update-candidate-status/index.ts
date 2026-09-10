// Supabase Edge Function: Update Candidate Status (HR Only)
// Handles HR status updates for candidates

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
      throw new Error('Unauthorized: Only HR users can update candidate status')
    }

    const { candidate_id, status, notes } = await req.json()

    if (!candidate_id || !status) {
      throw new Error('Missing required fields: candidate_id, status')
    }

    // Validate status
    const validStatuses = [
      'NEW',
      'CONTACTED',
      'SCREENING',
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_COMPLETED',
      'EVALUATED',
      'OFFER_EXTENDED',
      'HIRED',
      'REJECTED',
      'WITHDRAWN'
    ]

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    // Get current status for history
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('id, status')
      .eq('id', candidate_id)
      .single()

    if (candidateError || !candidate) {
      throw new Error('Candidate not found')
    }

    const previousStatus = candidate.status

    // Update candidate status
    const { data: updatedCandidate, error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({
        status,
        status_updated_at: new Date().toISOString(),
        status_updated_by: user.id
      })
      .eq('id', candidate_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Add status history entry
    await supabaseAdmin
      .from('status_history')
      .insert({
        candidate_id,
        previous_status: previousStatus,
        new_status: status,
        changed_by: user.id,
        notes: notes || null,
        changed_at: new Date().toISOString()
      })

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'candidate_status_updated',
        entity_type: 'candidate',
        entity_id: candidate_id,
        metadata: {
          previous_status: previousStatus,
          new_status: status,
          notes: notes || null
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        candidate: updatedCandidate,
        message: 'Candidate status updated successfully'
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
