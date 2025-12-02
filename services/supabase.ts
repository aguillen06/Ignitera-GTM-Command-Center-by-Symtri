
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, RateLimitError } from './rateLimiter';

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

// Helper to create a rate-limited builder that wraps the original Supabase builder
const createRateLimitedBuilder = (originalBuilder: any, operationType: 'read' | 'write') => {
  const rateLimitKey = operationType === 'read' ? 'supabase:read' : 'supabase:write';
  
  // Create a proxy that intercepts the terminal methods (select, insert, update, delete)
  // and enforces rate limiting before executing
  const createProxy = (target: any, currentOperationType: 'read' | 'write'): any => {
    return new Proxy(target, {
      get(obj, prop) {
        const value = obj[prop];
        
        // These are the chainable methods - wrap their return values too
        if (typeof value === 'function') {
          return (...args: any[]) => {
            const result = value.apply(obj, args);
            
            // Update operation type based on the method called
            let newOperationType = currentOperationType;
            if (prop === 'insert' || prop === 'update' || prop === 'delete') {
              newOperationType = 'write';
            } else if (prop === 'select') {
              newOperationType = 'read';
            }
            
            // If result is a promise (terminal operation like .single() or .then())
            if (result && typeof result.then === 'function' && prop !== 'then') {
              // Wrap the promise to check rate limit before execution
              return createProxy(result, newOperationType);
            }
            
            // For 'then' - this is the terminal execution point
            if (prop === 'then') {
              const limitKey = newOperationType === 'read' ? 'supabase:read' : 'supabase:write';
              const rateLimitResult = checkRateLimit(limitKey);
              
              if (!rateLimitResult.allowed) {
                // Return a rejected promise with rate limit error
                return Promise.reject(new RateLimitError(
                  rateLimitResult.message,
                  rateLimitResult.retryAfterMs,
                  limitKey
                )).then(...args);
              }
              
              return result;
            }
            
            // For chainable methods, wrap the result
            if (result && typeof result === 'object') {
              return createProxy(result, newOperationType);
            }
            
            return result;
          };
        }
        
        return value;
      }
    });
  };
  
  return createProxy(originalBuilder, operationType);
};

// Create the actual Supabase client
const baseClient = isConfigured ? createClient(supabaseUrl, supabaseKey) : null;

// 2. Initialize the Client with rate limiting wrapper
export const supabase = isConfigured && baseClient
  ? {
      from: (table: string) => {
        const originalBuilder = baseClient.from(table);
        // Start with 'read' as the default operation type
        // It will be updated when insert/update/delete is called
        return createRateLimitedBuilder(originalBuilder, 'read');
      },
      auth: baseClient.auth,
      // Expose the raw client for cases where rate limiting isn't needed
      _rawClient: baseClient,
    } as any
  : {
      from: () => createMockBuilder(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: {}, error: { message: "Supabase keys missing. Cannot sign in." } }),
        signUp: () => Promise.resolve({ data: {}, error: { message: "Supabase keys missing. Cannot sign up." } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      _rawClient: null,
    } as any;

export const isSupabaseConfigured = () => isConfigured;

// Re-export rate limit error for handling in components
export { RateLimitError, isRateLimitError } from './rateLimiter';
