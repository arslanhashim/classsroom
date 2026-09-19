import { supabase } from '../utils/supabaseClient';

/**
 * Register a new teacher account.
 * Automatically triggers profile creation in public.instructors.
 */
export async function signUpTeacher(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Log in an existing teacher.
 */
export async function signInTeacher(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Log out current session.
 */
export async function signOutTeacher() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the currently active authenticated user.
 */
export async function getActiveUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Listen for changes in authentication state (Login, Logout, Session Expiry).
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}