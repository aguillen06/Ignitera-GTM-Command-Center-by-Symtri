import { describe, it, expect, vi } from 'vitest';
import { executeVoiceTool } from '../services/voice_tools';

// Mock supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

describe('Voice Tools Service', () => {
  describe('executeVoiceTool', () => {
    it('should handle unknown tool gracefully', async () => {
      const result = await executeVoiceTool('unknown_tool', {});
      expect(result).toHaveProperty('error');
      expect(result.error).toBe('Unknown tool');
    });

    it('should handle create_quick_note tool', async () => {
      const result = await executeVoiceTool('create_quick_note', {
        content: 'Test note',
      });
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('success');
    });

    it('should catch and return errors from tool execution', async () => {
      // Test error handling in voice tools
      const result = await executeVoiceTool('invalid_tool', {});
      expect(result).toBeDefined();
    });
  });

  describe('Tool Definitions', () => {
    it('should export VOICE_TOOLS array', async () => {
      const { VOICE_TOOLS } = await import('../services/voice_tools');
      expect(VOICE_TOOLS).toBeDefined();
      expect(Array.isArray(VOICE_TOOLS)).toBe(true);
      expect(VOICE_TOOLS.length).toBeGreaterThan(0);
    });
  });
});
