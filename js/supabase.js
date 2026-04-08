// js/supabase.js
// Use unpkg/supabase to import as ES module or directly. 
// For Vanilla JS, we'll use standard ES Modules so we can `import` in script tags.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace with your actual Supabase Project URL and Anon Key
export const supabaseUrl = 'https://fjmggukgyjdgeaxwmeyb.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbWdndWtneWpkZ2VheHdtZXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg4NjEsImV4cCI6MjA5MDU1NDg2MX0.72FKULy8gRPTRzuEHwO_VEC1IfaFvd3xzPZSl_TcrJo';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Ensures the user is logged in. Redirects to login if not.
 * Also enforces the "needs_password_reset" rule unless bypass is true.
 */
export async function requireAuth(bypassPasswordResetCheck = false) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!session || error) {
    window.location.href = '/login.html';
    return null;
  }

  if (!bypassPasswordResetCheck) {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile?.needs_password_reset) {
      window.location.href = '/reset-password.html';
      return null;
    }
    
    // Attach profile to session object for convenience
    session.profile = profile;
  }

  return session;
}