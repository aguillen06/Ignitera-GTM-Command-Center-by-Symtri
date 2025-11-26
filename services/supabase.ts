
import { createClient } from '@supabase/supabase-js';

// 1. PRODUCTION CONFIGURATION
// We explicitly DO NOT hardcode keys here for security.
// These will be read from Vercel Environment Variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

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
      from: () => createMockBuilder()
    } as any;

export const isSupabaseConfigured = () => isConfigured;
