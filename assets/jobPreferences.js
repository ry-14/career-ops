import { supabase } from './supabaseClient.js';

export async function getJobPreferences(userId) {
  const { data, error } = await supabase
    .from('job_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveJobPreferences(userId, prefs) {
  const { error } = await supabase
    .from('job_preferences')
    .upsert({ user_id: userId, ...prefs });
  if (error) throw error;
}
