/**
 * Unit Tests for Gemini Service
 * Tests AI integration functionality and error handling
 */

import { geminiService } from '../gemini';
import { ENV } from '@/config/env';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock ENV
jest.mock('@/config/env', () => ({
  ENV: {
    GEMINI_API_KEY: 'test-api-key',
  },
}));

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractCovenants', () => {
    it('should extract covenants successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    covenants: [
                      {
                        covenant_name: 'Debt to EBITDA Ratio',
                        covenant_type: 'financial',
                        metric_name: 'debt_to_ebitda',
                        operator: '<=',
                        threshold_value: 3.0,
                        threshold_unit: 'ratio',
                        check_frequency: 'quarterly',
                        covenant_clause: 'Borrower shall maintain a debt to EBITDA ratio not exceeding 3.0:1.0',
                        confidence_score: 0.95,
                      },
                    ],
                    summary: 'Successfully extracted 1 financial covenant',
                  }),
                },
              ],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const contractText = 'Borrower shall maintain a debt to EBITDA ratio not exceeding 3.0:1.0';
      const result = await geminiService.extractCovenants(contractText);

      expect(result).toBeDefined();
      expect(result.covenants).toHaveLength(1);
      expect(result.covenants[0].covenant_name).toBe('Debt to EBITDA Ratio');
      expect(result.covenants[0].covenant_type).toBe('financial');
      expect(result.covenants[0].threshold_value).toBe(3.0);
      expect(result.extraction_summary).toBe('Successfully extracted 1 financial covenant');
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining(contractText),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      const contractText = 'Invalid contract text';

      await expect(geminiService.extractCovenants(contractText))
        .rejects.toThrow('Covenant extraction failed: Gemini API error: 400 - Bad Request');
    });

    it('should handle invalid JSON responses', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Invalid JSON response',
                },
              ],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const contractText = 'Test contract text';

      await expect(geminiService.extractCovenants(contractText))
        .rejects.toThrow('Covenant extraction failed: Failed to parse AI response');
    });

    it('should handle missing API key', async () => {
      // Create a service instance with empty API key
      const originalApiKey = (geminiService as any).apiKey;
      (geminiService as any).apiKey = '';

      await expect(geminiService.extractCovenants('test'))
        .rejects.toThrow('Gemini API key not configured');

      // Restore original API key
      (geminiService as any).apiKey = originalApiKey;
    });

    it('should validate extracted covenant data', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    covenants: [
                      {
                        // Missing required fields
                        covenant_name: '',
                        threshold_value: 'invalid',
                      },
                      {
                        // Valid covenant
                        covenant_name: 'Valid Covenant',
                        covenant_type: 'financial',
                        operator: '>=',
                        threshold_value: 1.5,
                        check_frequency: 'quarterly',
                        covenant_clause: 'Valid clause',
                        confidence_score: 0.8,
                      },
                    ],
                    summary: 'Mixed quality extraction',
                  }),
                },
              ],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await geminiService.extractCovenants('test contract');

      expect(result.covenants).toHaveLength(2);
      
      // First covenant should have defaults for invalid data
      expect(result.covenants[0].covenant_name).toBe('Unknown Covenant');
      expect(result.covenants[0].threshold_value).toBe(0);
      
      // Second covenant should be preserved correctly
      expect(result.covenants[1].covenant_name).toBe('Valid Covenant');
      expect(result.covenants[1].threshold_value).toBe(1.5);
    });
  });

  describe('analyzeCovenantRisk', () => {
    it('should analyze covenant risk successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    risk_score: 7,
                    risk_factors: ['Declining EBITDA', 'Increasing debt levels'],
                    recommended_actions: ['Monitor monthly', 'Request updated financials'],
                    assessment_summary: 'Covenant is approaching breach threshold',
                    confidence_level: 0.85,
                  }),
                },
              ],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 75,
          totalTokenCount: 225,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const covenantData = {
        covenant_name: 'Debt to EBITDA Ratio',
        current_value: 2.8,
        threshold_value: 3.0,
        trend: 'deteriorating' as const,
        buffer_percentage: 6.7,
      };

      const result = await geminiService.analyzeCovenantRisk(covenantData);

      expect(result.risk_score).toBe(7);
      expect(result.risk_factors).toContain('Declining EBITDA');
      expect(result.recommended_actions).toContain('Monitor monthly');
      expect(result.assessment_summary).toBe('Covenant is approaching breach threshold');
      expect(result.confidence_level).toBe(0.85);
    });

    it('should handle risk analysis with financial context', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    risk_score: 4,
                    risk_factors: ['Industry volatility'],
                    recommended_actions: ['Continue monitoring'],
                    assessment_summary: 'Moderate risk with industry context',
                    confidence_level: 0.75,
                  }),
                },
              ],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 100,
          totalTokenCount: 300,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const covenantData = {
        covenant_name: 'Current Ratio',
        current_value: 1.3,
        threshold_value: 1.25,
        trend: 'stable' as const,
      };

      const financialContext = {
        borrower_name: 'Test Company',
        industry: 'Manufacturing',
        recent_metrics: {
          revenue: 10000000,
          ebitda: 2000000,
        },
      };

      const result = await geminiService.analyzeCovenantRisk(covenantData, financialContext);

      expect(result.risk_score).toBe(4);
      expect(result.assessment_summary).toBe('Moderate risk with industry context');
    });
  });

  describe('analyzeAdverseEvent', () => {
    it('should analyze adverse events successfully', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    risk_score: 8,
                    impact_assessment: 'Significant negative impact on financial performance expected',
                    affected_covenants: ['Debt to EBITDA Ratio', 'Interest Coverage Ratio'],
                    recommended_actions: ['Immediate covenant review', 'Request management discussion'],
                  }),
                },
              ],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 180,
          candidatesTokenCount: 90,
          totalTokenCount: 270,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const eventData = {
        headline: 'Company announces major restructuring',
        description: 'Significant workforce reduction and facility closures',
        event_type: 'corporate_restructuring',
      };

      const borrowerContext = {
        borrower_name: 'Test Corporation',
        industry: 'Technology',
        active_covenants: [
          { covenant_name: 'Debt to EBITDA Ratio', covenant_type: 'financial' },
          { covenant_name: 'Interest Coverage Ratio', covenant_type: 'financial' },
        ],
      };

      const result = await geminiService.analyzeAdverseEvent(eventData, borrowerContext);

      expect(result.risk_score).toBe(8);
      expect(result.impact_assessment).toBe('Significant negative impact on financial performance expected');
      expect(result.affected_covenants).toContain('Debt to EBITDA Ratio');
      expect(result.recommended_actions).toContain('Immediate covenant review');
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is accessible', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const isHealthy = await geminiService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when API is not accessible', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await geminiService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false when API key is not configured', async () => {
      // Temporarily remove API key
      const originalApiKey = (geminiService as any).apiKey;
      (geminiService as any).apiKey = '';

      const isHealthy = await geminiService.healthCheck();
      expect(isHealthy).toBe(false);

      // Restore original API key
      (geminiService as any).apiKey = originalApiKey;
    });
  });
});