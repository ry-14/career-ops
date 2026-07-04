#!/usr/bin/env node
/**
 * Smoke tests for hosted web app helpers (no browser, no Supabase network).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)));
let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  failed += 1;
  console.error(`  ✗ ${label}`);
  if (err) console.error(`    ${err.message || err}`);
}

async function run() {
  console.log('test-web-app.mjs\n');

  try {
    const envPath = join(root, '.env');
    if (!existsSync(envPath)) {
      const text = readFileSync(join(root, '.env.example'), 'utf8')
        .replace('https://your-project.supabase.co', 'https://test.supabase.co')
        .replace('your-anon-key', 'test-anon-key-for-ci');
      writeFileSync(envPath, text, 'utf8');
    }
    execSync('node scripts/sync-supabase-config.mjs', { cwd: root, stdio: 'pipe' });
    const cfg = readFileSync(join(root, 'assets', 'supabaseConfig.js'), 'utf8');
    if (!cfg.includes('SUPABASE_URL') || !cfg.includes('SUPABASE_ANON_KEY')) {
      throw new Error('supabaseConfig.js missing exports');
    }
    ok('sync-supabase-config generates assets/supabaseConfig.js');
  } catch (err) {
    fail('sync-supabase-config', err);
  }

  try {
    const mod = await import(pathToFileURL(join(root, 'assets', 'onboardingHelpers.js')).href);
    if (!mod.needsOnboarding({ target_job_titles: [] })) throw new Error('empty titles should need onboarding');
    if (mod.needsOnboarding({ onboarding_skipped_at: '2026-01-01' })) {
      throw new Error('skipped onboarding should not redirect');
    }
    if (mod.needsOnboarding({ target_job_titles: ['Engineer'] })) {
      throw new Error('titles should pass onboarding');
    }
    if (!mod.needsPreferencesBanner({ onboarding_skipped_at: '2026-01-01' })) {
      throw new Error('skipped should show banner');
    }
    ok('jobPreferences needsOnboarding / needsPreferencesBanner');
  } catch (err) {
    fail('jobPreferences helpers', err);
  }

  try {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    if (html.includes('__getCurrentAuthMode')) throw new Error('global auth hook still present');
    if (!html.includes('auth-tab-login')) throw new Error('auth modal missing');
    ok('index.html auth modal (no global __getCurrentAuthMode)');
  } catch (err) {
    fail('index.html', err);
  }

  try {
    const src = readFileSync(join(root, 'supabase', 'functions', 'evaluate-job', 'index.ts'), 'utf8');
    if (!src.includes('resume_text')) throw new Error('evaluate-job missing resume_text');
    if (!src.includes('portfolio_projects')) throw new Error('evaluate-job missing portfolio');
    if (!src.includes('ilike')) throw new Error('evaluate-job missing dedup lookup');
    ok('evaluate-job includes resume, portfolio, dedup');
  } catch (err) {
    fail('evaluate-job', err);
  }

  try {
    const client = readFileSync(join(root, 'assets', 'supabaseClient.js'), 'utf8');
    if (!client.includes('./supabaseConfig.js')) throw new Error('supabaseClient not using config module');
    ok('supabaseClient imports supabaseConfig.js');
  } catch (err) {
    fail('supabaseClient', err);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run();
