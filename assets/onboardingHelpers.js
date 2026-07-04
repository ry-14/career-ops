export function needsOnboarding(preferences) {
  if (!preferences) return true;
  if (preferences.onboarding_skipped_at) return false;
  return !Array.isArray(preferences.target_job_titles) || preferences.target_job_titles.length === 0;
}

export function needsPreferencesBanner(preferences) {
  if (!preferences) return true;
  if (preferences.onboarding_skipped_at) return true;
  return !Array.isArray(preferences.target_job_titles) || preferences.target_job_titles.length === 0;
}
