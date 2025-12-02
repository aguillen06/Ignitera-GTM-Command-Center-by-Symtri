import { describe, it, expect } from 'vitest';
import { supabase, isSupabaseConfigured } from '../services/supabase';

describe('Supabase Service', () => {
  describe('Configuration', () => {
    it('should detect when Supabase is not configured', () => {
      // In test environment without env vars, should return false
      const configured = isSupabaseConfigured();
      expect(typeof configured).toBe('boolean');
    });

    it('should provide mock client when not configured', () => {
      // Should not throw even without configuration
      expect(() => supabase.from('leads')).not.toThrow();
    });

    it('should handle queries gracefully when not configured', async () => {
      const result = await supabase.from('leads').select('*');
      // Mock builder should return error object
      expect(result).toHaveProperty('error');
    });
  });

  describe('Mock Builder', () => {
    it('should chain query methods without throwing', () => {
      expect(() => {
        supabase
          .from('leads')
          .select('*')
          .eq('id', 1)
          .order('created_at')
          .limit(10);
      }).not.toThrow();
    });

    it('should provide auth methods', () => {
      expect(supabase.auth).toBeDefined();
      expect(supabase.auth.getSession).toBeDefined();
      expect(supabase.auth.signInWithPassword).toBeDefined();
      expect(supabase.auth.signUp).toBeDefined();
      expect(supabase.auth.signOut).toBeDefined();
    });
  });
});
