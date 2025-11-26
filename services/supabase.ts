
import { createClient } from '@supabase/supabase-js';

// 1. CONFIGURATION
// SECURE: Use environment variables for production.
// Do NOT hardcode keys here before pushing to GitHub.
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if keys are actually configured
const isConfigured = supabaseUrl !== '' && supabaseKey !== '';

// Helper to create a chainable mock builder (Prevents crashes if keys are missing)
const createMockBuilder = () => {
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve({ data: null, error: { message: "Supabase not connected. Check environment variables." } }),
    then: (resolve: any) => Promise.resolve({ data: [], error: { message: "Supabase not connected. Check environment variables." } }).then(resolve)
  };
  return builder;
};

// 2. Initialize the Client
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => createMockBuilder(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: {}, error: { message: "Supabase keys missing. Cannot sign in." } }),
        signUp: () => Promise.resolve({ data: {}, error: { message: "Supabase keys missing. Cannot sign up." } }),
        signOut: () => Promise.resolve({ error: null }),
      }
    } as any;

export const isSupabaseConfigured = () => isConfigured;
