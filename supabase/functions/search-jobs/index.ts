// Deno Edge Function: searches Adzuna's free-tier job API using the
// caller's saved job_preferences (or explicit overrides), returns raw
// listings. Does not write to the database — evaluate-job handles that
// once the user picks a result to evaluate.
//
// Deploy: supabase functions deploy search-jobs
// Secrets: supabase secrets set ADZUNA_APP_ID=... ADZUNA_APP_KEY=...
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADZUNA_APP_ID = Deno.env.get('ADZUNA_APP_ID');
const ADZUNA_APP_KEY = Deno.env.get('ADZUNA_APP_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  let userData;
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data?.user) return json({ error: 'Unauthorized' }, 401);
    userData = data;
  } catch {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine, falls back to saved preferences
  }

  let what = String(body?.what ?? '').trim();
  let where = String(body?.where ?? '').trim();
  const country = String(body?.country ?? 'us').trim() || 'us';

  if (!what || !where) {
    const { data: prefs } = await supabase
      .from('job_preferences')
      .select('target_job_titles, preferred_locations')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!what) what = prefs?.target_job_titles?.[0] ?? '';
    if (!where) where = prefs?.preferred_locations?.[0] ?? '';
  }

  if (!what) {
    return json({ error: 'No target job title found. Add one in Settings or pass "what".' }, 400);
  }
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return json({ error: 'Adzuna credentials are not configured on the server.' }, 500);
  }

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    what,
    results_per_page: '20',
    content_type: 'application/json',
  });
  if (where) params.set('where', where);

  let res;
  try {
    res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
  } catch (err) {
    return json({ error: `Adzuna request failed: ${err.message}` }, 502);
  }

  if (!res.ok) {
    const text = await res.text();
    return json({ error: `Adzuna API error (${res.status}): ${text.slice(0, 200)}` }, 502);
  }

  const data = await res.json();
  const results = Array.isArray(data?.results)
    ? data.results.map((r) => ({
        title: r.title,
        company: r.company?.display_name ?? 'Unknown',
        location: r.location?.display_name ?? '',
        url: r.redirect_url,
        description: r.description,
        created: r.created,
      }))
    : [];

  return json({ results, what, where, country });
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
