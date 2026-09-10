#!/bin/bash

# TalentGate Edge Functions Deployment Script
# This script deploys all Edge Functions to Supabase

set -e  # Exit on error

echo "🚀 Starting TalentGate Edge Functions Deployment..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login first:"
    echo "   supabase login"
    exit 1
fi

# List of all functions to deploy
FUNCTIONS=(
    "candidate-register"
    "upload-file"
    "upload-recording"
    "submit-interview"
    "submit-evaluation"
    "update-candidate-status"
    "get-signed-url"
    "get-recording-playback"
)

# Deploy each function
echo "📦 Deploying ${#FUNCTIONS[@]} Edge Functions..."
echo ""

for func in "${FUNCTIONS[@]}"; do
    echo "  → Deploying $func..."
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo "    ✅ $func deployed successfully"
    else
        echo "    ❌ Failed to deploy $func"
        exit 1
    fi
done

echo ""
echo "✅ All functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Set environment variables in Supabase Dashboard:"
echo "     - Go to: Edge Functions → Secrets"
echo "     - Add: SUPABASE_URL"
echo "     - Add: SUPABASE_ANON_KEY"
echo "     - Add: SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "  2. Test the functions:"
echo "     - Open your app and test candidate registration"
echo "     - Test file uploads"
echo "     - Test interview recording"
echo ""
echo "  3. Monitor logs:"
echo "     - Go to: Edge Functions → Logs"
echo ""
echo "🎉 Deployment complete!"
