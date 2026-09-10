// Supabase Edge Function: File Upload (CV/Profile Photo)
// Handles secure upload of candidate documents

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
    const fileType = formData.get('file_type') as string // 'cv' or 'profile_photo'

    if (!file || !fileType) {
      throw new Error('Missing required fields: file, file_type')
    }

    // Determine bucket and validation rules
    let bucket: string
    let allowedTypes: string[]
    let maxSize: number
    let pathPrefix: string

    if (fileType === 'cv') {
      bucket = 'candidate-cvs'
      allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      maxSize = 10 * 1024 * 1024 // 10MB
      pathPrefix = 'cv'
    } else if (fileType === 'profile_photo') {
      bucket = 'candidate-profile-photos'
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      maxSize = 5 * 1024 * 1024 // 5MB
      pathPrefix = 'profile-photo'
    } else {
      throw new Error('Invalid file_type. Must be "cv" or "profile_photo"')
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`)
    }

    // Validate file size
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`)
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${pathPrefix}/${Date.now()}.${fileExt}`

    // Upload to storage
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (storageError) throw storageError

    // Update candidate record
    const updateData = fileType === 'cv' 
      ? { cv_path: fileName }
      : { profile_photo_path: fileName }

    const { data: candidateData, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (candidateError) throw candidateError

    // Log audit entry
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'file_uploaded',
        entity_type: 'candidate',
        entity_id: user.id,
        metadata: {
          file_type: fileType,
          file_size: file.size,
          file_name: fileName
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        file_path: fileName,
        candidate: candidateData,
        message: 'File uploaded successfully'
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
