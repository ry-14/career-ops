import { supabase } from './supabaseClient.js';

const TEXT_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/json',
]);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown']);

function isTextFile(file) {
  if (TEXT_TYPES.has(file.type)) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

async function readFileAsText(file) {
  return file.text();
}

export async function uploadResume(userId, file) {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${userId}/resume.${ext}`;
  const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
  if (error) throw error;

  let resumeText = null;
  if (isTextFile(file)) {
    resumeText = (await readFileAsText(file)).slice(0, 12000);
  }

  await supabase.from('job_preferences').upsert({
    user_id: userId,
    resume_url: path,
    resume_text: resumeText,
  });
  return path;
}

export async function saveResumeText(userId, resumeText) {
  const { error } = await supabase
    .from('job_preferences')
    .upsert({ user_id: userId, resume_text: resumeText?.slice(0, 12000) || null });
  if (error) throw error;
}

export async function getResumeSignedUrl(resumePath) {
  if (!resumePath) return null;
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(resumePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function getPortfolioProjects(userId) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPortfolioProject(userId, project) {
  const { data, error } = await supabase
    .from('portfolio_projects')
    .insert({ user_id: userId, ...project })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePortfolioProject(id) {
  const { error } = await supabase.from('portfolio_projects').delete().eq('id', id);
  if (error) throw error;
}
