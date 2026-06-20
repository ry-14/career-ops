import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://mnuerdafmbobkxqbvitc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWVyZGFmbWJvYmt4cWJ2aXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDc4ODcsImV4cCI6MjA5NzM4Mzg4N30.whtf0w7tS6Mq66lunaOx_n2vqv_Dhd_6O9uO442DvJw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
