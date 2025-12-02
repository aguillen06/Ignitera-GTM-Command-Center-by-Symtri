/**
 * Rate Limiter Service
 * 
 * Implements client-side rate limiting for API calls to protect against:
 * - Excessive Gemini AI requests (expensive)
 * - Supabase database abuse
 * - Bot/automation abuse
 * 
 * Uses a token bucket algorithm with configurable limits per action type.
 */

export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed in the time window
  windowMs: number;         // Time window in milliseconds
  cooldownMs?: number;      // Optional cooldown period after hitting limit
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  retryAfterMs: number;
  message: string;
}

interface RateLimitState {
  requests: number[];       // Timestamps of requests in current window
  cooldownUntil: number;    // Timestamp when cooldown ends (0 if not in cooldown)
}

// Rate limit configurations for different action types
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Gemini AI calls - Most expensive, most restrictive
  'gemini:deep-strategy': {
    maxRequests: 3,
    windowMs: 60 * 1000,      // 3 requests per minute
    cooldownMs: 30 * 1000,    // 30 second cooldown after hitting limit
  },
  'gemini:market-research': {
    maxRequests: 5,
    windowMs: 60 * 1000,      // 5 requests per minute
    cooldownMs: 20 * 1000,
  },
  'gemini:auto-prospect': {
    maxRequests: 3,
    windowMs: 60 * 1000,      // 3 requests per minute
    cooldownMs: 30 * 1000,
  },
  'gemini:lead-enrichment': {
    maxRequests: 10,
    windowMs: 60 * 1000,      // 10 requests per minute
    cooldownMs: 15 * 1000,
  },
  'gemini:live-enrichment': {
    maxRequests: 5,
    windowMs: 60 * 1000,      // 5 requests per minute
    cooldownMs: 20 * 1000,
  },
  'gemini:outbound-draft': {
    maxRequests: 10,
    windowMs: 60 * 1000,      // 10 requests per minute
    cooldownMs: 15 * 1000,
  },
  'gemini:boolean-search': {
    maxRequests: 5,
    windowMs: 60 * 1000,      // 5 requests per minute
    cooldownMs: 15 * 1000,
  },
  'gemini:parse-lead': {
    maxRequests: 10,
    windowMs: 60 * 1000,      // 10 requests per minute
    cooldownMs: 10 * 1000,
  },
  'gemini:location-verify': {
    maxRequests: 10,
    windowMs: 60 * 1000,      // 10 requests per minute
    cooldownMs: 10 * 1000,
  },
  'gemini:bulk-drafts': {
    maxRequests: 2,
    windowMs: 60 * 1000,      // 2 bulk operations per minute
    cooldownMs: 60 * 1000,    // 1 minute cooldown
  },
  
  // Supabase calls - Less restrictive but still protected
  'supabase:read': {
    maxRequests: 60,
    windowMs: 60 * 1000,      // 60 reads per minute
    cooldownMs: 5 * 1000,
  },
  'supabase:write': {
    maxRequests: 30,
    windowMs: 60 * 1000,      // 30 writes per minute
    cooldownMs: 10 * 1000,
  },
};

// In-memory state storage (per-session)
const rateLimitState: Map<string, RateLimitState> = new Map();

/**
 * Check if an action is allowed under rate limiting rules
 */
export function checkRateLimit(actionType: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[actionType];
  
  // If no config exists, allow the request
  if (!config) {
    return {
      allowed: true,
      remainingRequests: Infinity,
      retryAfterMs: 0,
      message: '',
    };
  }

  const now = Date.now();
  let state = rateLimitState.get(actionType);

  // Initialize state if not exists
  if (!state) {
    state = { requests: [], cooldownUntil: 0 };
    rateLimitState.set(actionType, state);
  }

  // Check if in cooldown period
  if (state.cooldownUntil > now) {
    const retryAfterMs = state.cooldownUntil - now;
    logThrottle(actionType, 'cooldown', retryAfterMs);
    return {
      allowed: false,
      remainingRequests: 0,
      retryAfterMs,
      message: `Rate limit cooldown active. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again.`,
    };
  }

  // Clean up old requests outside the window
  const windowStart = now - config.windowMs;
  state.requests = state.requests.filter(timestamp => timestamp > windowStart);

  // Check if we're at the limit
  if (state.requests.length >= config.maxRequests) {
    // Enter cooldown if configured
    if (config.cooldownMs) {
      state.cooldownUntil = now + config.cooldownMs;
    }
    
    const oldestRequest = state.requests[0];
    const retryAfterMs = config.cooldownMs || (oldestRequest + config.windowMs - now);
    
    logThrottle(actionType, 'limit-reached', retryAfterMs);
    
    return {
      allowed: false,
      remainingRequests: 0,
      retryAfterMs,
      message: `Rate limit exceeded for this action. Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again.`,
    };
  }

  // Request is allowed - record it
  state.requests.push(now);
  const remainingRequests = config.maxRequests - state.requests.length;

  return {
    allowed: true,
    remainingRequests,
    retryAfterMs: 0,
    message: '',
  };
}

/**
 * Consume a rate limit token (call this after checkRateLimit returns allowed=true)
 * This is already done in checkRateLimit, so this is a no-op for backward compatibility
 */
export function consumeRateLimit(actionType: string): void {
  // Token is already consumed in checkRateLimit when allowed=true
  // This function exists for explicit semantics if needed
}

/**
 * Get current rate limit status without consuming a token
 */
export function getRateLimitStatus(actionType: string): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[actionType];
  
  if (!config) {
    return {
      allowed: true,
      remainingRequests: Infinity,
      retryAfterMs: 0,
      message: '',
    };
  }

  const now = Date.now();
  const state = rateLimitState.get(actionType);

  if (!state) {
    return {
      allowed: true,
      remainingRequests: config.maxRequests,
      retryAfterMs: 0,
      message: '',
    };
  }

  // Check cooldown
  if (state.cooldownUntil > now) {
    return {
      allowed: false,
      remainingRequests: 0,
      retryAfterMs: state.cooldownUntil - now,
      message: `Rate limit cooldown active.`,
    };
  }

  // Count requests in current window
  const windowStart = now - config.windowMs;
  const activeRequests = state.requests.filter(t => t > windowStart).length;
  const remainingRequests = Math.max(0, config.maxRequests - activeRequests);

  return {
    allowed: remainingRequests > 0,
    remainingRequests,
    retryAfterMs: remainingRequests > 0 ? 0 : (state.requests[0] + config.windowMs - now),
    message: remainingRequests > 0 ? '' : 'Rate limit would be exceeded.',
  };
}

/**
 * Reset rate limit state for a specific action (useful for testing)
 */
export function resetRateLimit(actionType: string): void {
  rateLimitState.delete(actionType);
}

/**
 * Reset all rate limit state
 */
export function resetAllRateLimits(): void {
  rateLimitState.clear();
}

/**
 * Log when throttling is triggered for observability
 */
function logThrottle(actionType: string, reason: string, retryAfterMs: number): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    actionType,
    reason,
    retryAfterMs,
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
  };
  
  console.warn('[Rate Limiter] Throttling triggered:', logEntry);
  
  // Store in session storage for pattern analysis
  try {
    const existingLogs = JSON.parse(sessionStorage.getItem('rateLimiterLogs') || '[]');
    existingLogs.push(logEntry);
    // Keep only last 100 entries
    if (existingLogs.length > 100) {
      existingLogs.shift();
    }
    sessionStorage.setItem('rateLimiterLogs', JSON.stringify(existingLogs));
  } catch {
    // Ignore storage errors (e.g., in SSR or when storage is full)
  }
}

/**
 * Get throttle logs for pattern analysis
 */
export function getThrottleLogs(): Array<{
  timestamp: string;
  actionType: string;
  reason: string;
  retryAfterMs: number;
}> {
  try {
    return JSON.parse(sessionStorage.getItem('rateLimiterLogs') || '[]');
  } catch {
    return [];
  }
}

/**
 * Create a rate-limited wrapper for any async function
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  actionType: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = checkRateLimit(actionType);
    
    if (!result.allowed) {
      throw new RateLimitError(result.message, result.retryAfterMs, actionType);
    }
    
    return fn(...args);
  }) as T;
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  public readonly retryAfterMs: number;
  public readonly actionType: string;
  public readonly isRateLimitError = true;

  constructor(message: string, retryAfterMs: number, actionType: string) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
    this.actionType = actionType;
  }
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError || 
    (error !== null && typeof error === 'object' && 'isRateLimitError' in error);
}
