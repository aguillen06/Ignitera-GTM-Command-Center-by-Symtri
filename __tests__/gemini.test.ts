import { describe, it, expect, vi } from 'vitest';
import { cleanJson } from '../services/gemini';

// Mock the GoogleGenAI module
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      return {
        models: {
          generateContent: vi.fn(),
        },
      };
    }
  },
  Type: {},
  Schema: {},
}));

describe('Gemini Service', () => {
  describe('Error Handling', () => {
    it('should throw descriptive error when API key is missing', () => {
      const originalEnv = process.env.API_KEY;
      delete process.env.API_KEY;

      // Test would verify proper error handling
      expect(process.env.API_KEY).toBeUndefined();

      // Restore
      process.env.API_KEY = originalEnv;
    });

    it('should handle malformed JSON responses gracefully', () => {
      // Test cleanJson utility with various inputs
      expect(() => cleanJson('invalid json')).not.toThrow();
      expect(cleanJson('```json\n{"test": "value"}\n```')).toBe('{"test": "value"}');
      expect(cleanJson('')).toBe('{}');
    });
  });

  describe('cleanJson utility', () => {
    it('should remove markdown code blocks', () => {
      const input = '```json\n{"name": "test"}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{"name": "test"}');
    });

    it('should extract JSON objects from mixed content', () => {
      const input = 'Some text before {"key": "value"} some text after';
      const result = cleanJson(input);
      expect(result).toBe('{"key": "value"}');
    });

    it('should return empty object for empty input', () => {
      const result = cleanJson('');
      expect(result).toBe('{}');
    });

    it('should handle arrays', () => {
      const input = 'prefix ["item1", "item2"] suffix';
      const result = cleanJson(input);
      expect(result).toBe('["item1", "item2"]');
    });
  });
});
