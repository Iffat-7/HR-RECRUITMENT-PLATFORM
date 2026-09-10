// Backend API Client for TalentGate
// Provides typed interface to all Edge Functions

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class BackendAPI {
  private async callFunction<T>(
    functionName: string,
    body: any,
    options: { method?: string; isFormData?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'POST', isFormData = false } = options

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method,
        headers,
        body: isFormData ? body : JSON.stringify(body)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Unknown error occurred'
      }
    }

    return {
      success: true,
      data: data as T,
      message: data.message
    }
  }

  // ============================================================================
  // CANDIDATE OPERATIONS
  // ============================================================================

  /**
   * Register a new candidate
   */
  async registerCandidate(data: {
    email: string
    password: string
    full_name: string
    mobile: string
    city: string
    cnic: string
    position_id?: string
  }) {
    return this.callFunction('candidate-register', data)
  }

  /**
   * Upload CV or profile photo
   */
  async uploadFile(file: File, fileType: 'cv' | 'profile_photo') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('file_type', fileType)

    return this.callFunction('upload-file', formData, { isFormData: true })
  }

  /**
   * Upload interview recording
   */
  async uploadRecording(
    file: File,
    interviewQuestionId: string,
    attemptNumber: number
  ) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('interview_question_id', interviewQuestionId)
    formData.append('attempt_number', attemptNumber.toString())

    return this.callFunction('upload-recording', formData, { isFormData: true })
  }

  /**
   * Submit completed interview
   */
  async submitInterview(interviewId: string) {
    return this.callFunction('submit-interview', { interview_id: interviewId })
  }

  // ============================================================================
  // HR OPERATIONS
  // ============================================================================

  /**
   * Submit evaluation for a candidate
   */
  async submitEvaluation(data: {
    candidate_id: string
    interview_id?: string
    overall_score: number
    recommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'STRONG_NO_HIRE'
    notes?: string
    category_scores?: Array<{
      category_id: string
      score: number
      notes?: string
    }>
  }) {
    return this.callFunction('submit-evaluation', data)
  }

  /**
   * Update candidate status
   */
  async updateCandidateStatus(
    candidateId: string,
    status: string,
    notes?: string
  ) {
    return this.callFunction('update-candidate-status', {
      candidate_id: candidateId,
      status,
      notes
    })
  }

  /**
   * Get signed URL for accessing private files
   */
  async getSignedUrl(
    bucket: 'candidate-cvs' | 'candidate-profile-photos' | 'interview-recordings',
    filePath: string,
    expiresIn?: number
  ) {
    return this.callFunction('get-signed-url', {
      bucket,
      file_path: filePath,
      expires_in: expiresIn
    })
  }

  /**
   * Get recording playback URL for HR
   */
  async getRecordingPlayback(recordingId: string) {
    return this.callFunction('get-recording-playback', {
      recording_id: recordingId
    })
  }
}

// Export singleton instance
export const backendAPI = new BackendAPI()

// Export types for convenience
export type { ApiResponse }
