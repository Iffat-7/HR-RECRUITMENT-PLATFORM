// CORS configuration for Edge Functions
// In production, restrict this to your actual frontend domain

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  // Add your production domain here
  // 'https://your-app.vercel.app',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // In development, allow all origins for convenience
  // In production, only allow specified origins
  const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';
  
  const allowedOrigin = isDevelopment || ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}
