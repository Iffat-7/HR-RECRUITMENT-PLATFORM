// Supabase Edge Function: Candidate Registration
// Deploy: supabase functions deploy candidate-register

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, full_name, mobile, city, cnic, position_id } = await req.json()

    // Validate required fields
    if (!email || !password || !full_name || !mobile || !city || !cnic) {
      throw new Error('Missing required fields')
    }

    // Validate CNIC format (XXXXX-XXXXXXX-X)
    const cnicRegex = /^\d{5}-\d{7}-\d$/
    if (!cnicRegex.test(cnic)) {
      throw new Error('Invalid CNIC format. Use format: XXXXX-XXXXXXX-X')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // Generate unique reference code
    const generateReferenceCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = 'CND-'
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    let referenceCode = generateReferenceCode()
    let isUnique = false
    
    // Ensure reference code is unique
    while (!isUnique) {
      const { data: existing } = await supabaseAdmin
        .from('candidates')
        .select('id')
        .eq('reference_code', referenceCode)
        .single()
      
      if (!existing) {
        isUnique = true
      } else {
        referenceCode = generateReferenceCode()
      }
    }

    // Create candidate record
    const { data: candidateData, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .insert({
        id: userId,
        reference_code: referenceCode,
        full_name,
        mobile,
        city,
        cnic,
        position_id: position_id || null,
        status: 'NEW',
        consent_given: true,
        consent_timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (candidateError) throw candidateError

    // Assign CANDIDATE role
    const { data: candidateRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'CANDIDATE')
      .single()

    if (candidateRole) {
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: candidateRole.id
        })
    }

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'candidate_registered',
        entity_type: 'candidate',
        entity_id: userId,
        metadata: { reference_code: referenceCode, email }
      })

    return new Response(
      JSON.stringify({
        success: true,
        candidate: candidateData,
        message: 'Candidate registered successfully'
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
