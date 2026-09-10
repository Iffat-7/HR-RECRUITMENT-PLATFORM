// Supabase Edge Function: Get Signed URL (HR Only)
// Generates temporary signed URLs for accessing private files

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
      throw new Error('Unauthorized: Only HR users can access signed URLs')
    }

    const { bucket, file_path, expires_in } = await req.json()

    if (!bucket || !file_path) {
      throw new Error('Missing required fields: bucket, file_path')
    }

    // Validate bucket
    const validBuckets = ['candidate-cvs', 'candidate-profile-photos', 'interview-recordings']
    if (!validBuckets.includes(bucket)) {
      throw new Error(`Invalid bucket. Must be one of: ${validBuckets.join(', ')}`)
    }

    // Default expiration: 1 hour
    const expiresIn = expires_in || 3600

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(file_path, expiresIn)

    if (signedUrlError) throw signedUrlError

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'signed_url_generated',
        entity_type: 'file',
        entity_id: file_path,
        metadata: {
          bucket,
          expires_in: expiresIn
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        signed_url: signedUrlData.signedUrl,
        expires_in: expiresIn,
        message: 'Signed URL generated successfully'
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
