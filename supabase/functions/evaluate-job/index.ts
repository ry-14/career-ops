// Deno Edge Function: evaluates a pasted job description against the
// caller's job_preferences using Gemini, then inserts a row into
// public.applications (RLS-scoped to the caller via their forwarded JWT).
//
// Deploy: supabase functions deploy evaluate-job
// Secret:  supabase secrets set GEMINI_API_KEY=...
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const GEMINI_MODEL = 'gemini-2.0-flash';

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

  let userId;
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    userId = userData.user.id;
  } catch {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const company = String(body?.company ?? '').trim();
  const role = String(body?.role ?? '').trim();
  const jobText = String(body?.jobText ?? '').trim();
  if (!company || !role || !jobText) {
    return json({ error: 'company, role, and jobText are required' }, 400);
  }

  const { data: prefs } = await supabase
    .from('job_preferences')
    .select('target_job_titles, preferred_industries, preferred_locations, work_mode, experience_level, skills')
    .eq('user_id', userId)
    .maybeSingle();

  let evaluation;
  try {
    evaluation = await callGemini(buildPrompt({ company, role, jobText, prefs }));
  } catch (err) {
    return json({ error: `Evaluation failed: ${err.message}` }, 502);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      company,
      role,
      score: evaluation.score,
      status: 'Evaluated',
      notes: evaluation.reasoning,
      tags: evaluation.tags,
    })
    .select()
    .single();

  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  return json({ evaluation, application: inserted });
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildPrompt({ company, role, jobText, prefs }) {
  const p = prefs || {};
  const preferences = {
    target_job_titles: p.target_job_titles || [],
    preferred_industries: p.preferred_industries || [],
    preferred_locations: p.preferred_locations || [],
    work_mode: p.work_mode || 'any',
    experience_level: p.experience_level || 'unspecified',
    skills: p.skills || [],
  };

  return `You are a job-fit evaluator. Score how well this job matches the candidate's stated preferences.

Candidate preferences (JSON): ${JSON.stringify(preferences)}

Job: ${company} — ${role}
Job description:
${jobText.slice(0, 6000)}

Return ONLY JSON in this exact shape, no extra text or markdown:
{"score": <number 0-5, one decimal>, "reasoning": "<max 2 sentences>", "tags": ["<short tag>", ...up to 5], "recommendation": "apply" or "skip"}`;
}

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 300 },
      }),
    }
  );

  if (res.status === 429) {
    throw new Error('Gemini rate limit reached. Try again shortly.');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned non-JSON output');
  }

  return {
    score: clampScore(parsed.score),
    reasoning: String(parsed.reasoning || '').slice(0, 500),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map(String) : [],
    recommendation: parsed.recommendation === 'apply' ? 'apply' : 'skip',
  };
}

function clampScore(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(5, Math.round(n * 10) / 10));
}
