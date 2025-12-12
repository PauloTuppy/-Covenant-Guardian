/**
 * Gemini AI Service
 * Handles integration with Google's Gemini AI for covenant extraction and risk analysis
 */

import { ENV } from '@/config/env';
import type { CovenantExtractionResult, RiskAssessment } from '@/types';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = ENV.GEMINI_API_KEY || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash';
    // Note: Gemini API key is optional - AI features use Xano's built-in Gemini credits
  }

  /**
   * Extract covenants from contract text using Gemini AI
   */
  async extractCovenants(contractText: string): Promise<CovenantExtractionResult> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildCovenantExtractionPrompt(contractText);
      const response = await this.callGeminiAPI(prompt, {
        temperature: 0.1, // Low temperature for consistent extraction
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      });

      const extractedData = this.parseCovenantExtractionResponse(response);
      const processingTime = Date.now() - startTime;

      return {
        covenants: extractedData.covenants,
        extraction_summary: extractedData.summary,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      console.error('Covenant extraction failed:', error);
      throw new Error(`Covenant extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze covenant risk using Gemini AI
   */
  async analyzeCovenantRisk(
    covenantData: {
      covenant_name: string;
      current_value?: number;
      threshold_value?: number;
      trend?: 'improving' | 'stable' | 'deteriorating';
      buffer_percentage?: number;
    },
    financialContext?: {
      borrower_name: string;
      industry?: string;
      recent_metrics?: Record<string, number>;
    }
  ): Promise<RiskAssessment> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = this.buildRiskAnalysisPrompt(covenantData, financialContext);
      const response = await this.callGeminiAPI(prompt, {
        temperature: 0.3, // Slightly higher for more nuanced analysis
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      });

      return this.parseRiskAnalysisResponse(response);
    } catch (error) {
      console.error('Risk analysis failed:', error);
      throw new Error(`Risk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze adverse events for risk impact
   */
  async analyzeAdverseEvent(
    eventData: {
      headline: string;
      description?: string;
      event_type: string;
    },
    borrowerContext: {
      borrower_name: string;
      industry?: string;
      active_covenants?: Array<{
        covenant_name: string;
        covenant_type: string;
      }>;
    }
  ): Promise<{
    risk_score: number;
    impact_assessment: string;
    affected_covenants: string[];
    recommended_actions: string[];
  }> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = this.buildAdverseEventAnalysisPrompt(eventData, borrowerContext);
      const response = await this.callGeminiAPI(prompt, {
        temperature: 0.2,
        maxOutputTokens: 1536,
        responseMimeType: 'application/json',
      });

      return this.parseAdverseEventResponse(response);
    } catch (error) {
      console.error('Adverse event analysis failed:', error);
      throw new Error(`Adverse event analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build covenant extraction prompt
   */
  private buildCovenantExtractionPrompt(contractText: string): string {
    return `
You are an expert financial analyst specializing in loan covenant extraction. Analyze the following contract text and extract all financial and operational covenants.

For each covenant found, provide:
1. covenant_name: A clear, descriptive name
2. covenant_type: One of "financial", "operational", "reporting", "other"
3. metric_name: The specific financial metric (e.g., "debt_to_ebitda", "current_ratio")
4. operator: The comparison operator ("<", "<=", ">", ">=", "=", "!=")
5. threshold_value: The numeric threshold (extract number only)
6. threshold_unit: The unit if applicable (e.g., "ratio", "dollars", "percent")
7. check_frequency: One of "monthly", "quarterly", "annually", "on_demand"
8. covenant_clause: The exact text from the contract
9. confidence_score: Your confidence in the extraction (0.0 to 1.0)

Contract Text:
${contractText}

Respond with valid JSON in this exact format:
{
  "covenants": [
    {
      "covenant_name": "string",
      "covenant_type": "financial|operational|reporting|other",
      "metric_name": "string",
      "operator": "<|<=|>|>=|=|!=",
      "threshold_value": number,
      "threshold_unit": "string",
      "check_frequency": "monthly|quarterly|annually|on_demand",
      "covenant_clause": "string",
      "confidence_score": number
    }
  ],
  "summary": "Brief summary of extraction results"
}

Focus on measurable, quantifiable covenants. If a covenant is unclear or ambiguous, set confidence_score below 0.7.
`;
  }

  /**
   * Build risk analysis prompt
   */
  private buildRiskAnalysisPrompt(
    covenantData: any,
    financialContext?: any
  ): string {
    const contextInfo = financialContext ? `
Borrower: ${financialContext.borrower_name}
Industry: ${financialContext.industry || 'Unknown'}
Recent Metrics: ${JSON.stringify(financialContext.recent_metrics || {})}
` : '';

    return `
You are a senior credit risk analyst. Analyze the following covenant situation and provide a comprehensive risk assessment.

Covenant Information:
- Name: ${covenantData.covenant_name}
- Current Value: ${covenantData.current_value || 'N/A'}
- Threshold: ${covenantData.threshold_value || 'N/A'}
- Trend: ${covenantData.trend || 'Unknown'}
- Buffer: ${covenantData.buffer_percentage || 'N/A'}%

${contextInfo}

Provide your analysis in this JSON format:
{
  "risk_score": number (1-10, where 10 is highest risk),
  "risk_factors": ["factor1", "factor2", ...],
  "recommended_actions": ["action1", "action2", ...],
  "assessment_summary": "Detailed narrative assessment",
  "confidence_level": number (0.0-1.0)
}

Consider:
- Proximity to covenant breach
- Trend direction and velocity
- Industry context and market conditions
- Buffer adequacy
- Historical performance patterns
`;
  }

  /**
   * Build adverse event analysis prompt
   */
  private buildAdverseEventAnalysisPrompt(eventData: any, borrowerContext: any): string {
    return `
You are a credit risk analyst evaluating the impact of adverse events on loan covenants.

Event Details:
- Headline: ${eventData.headline}
- Description: ${eventData.description || 'N/A'}
- Event Type: ${eventData.event_type}

Borrower Context:
- Company: ${borrowerContext.borrower_name}
- Industry: ${borrowerContext.industry || 'Unknown'}
- Active Covenants: ${JSON.stringify(borrowerContext.active_covenants || [])}

Analyze the potential impact and respond in JSON format:
{
  "risk_score": number (1-10),
  "impact_assessment": "Detailed impact analysis",
  "affected_covenants": ["covenant1", "covenant2", ...],
  "recommended_actions": ["action1", "action2", ...]
}

Consider:
- Direct financial impact on covenant metrics
- Indirect effects on business operations
- Market perception and credit rating implications
- Timeline of potential covenant impacts
`;
  }

  /**
   * Call Gemini API with retry logic
   */
  private async callGeminiAPI(
    prompt: string,
    config: GeminiRequest['generationConfig'] = {}
  ): Promise<GeminiResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const request: GeminiRequest = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        ...config,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    return data;
  }

  /**
   * Parse covenant extraction response
   */
  private parseCovenantExtractionResponse(response: GeminiResponse): {
    covenants: CovenantExtractionResult['covenants'];
    summary: string;
  } {
    try {
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);

      if (!parsed.covenants || !Array.isArray(parsed.covenants)) {
        throw new Error('Invalid response format: missing covenants array');
      }

      return {
        covenants: parsed.covenants.map((covenant: any) => ({
          covenant_name: covenant.covenant_name || 'Unknown Covenant',
          covenant_type: covenant.covenant_type || 'other',
          metric_name: covenant.metric_name || '',
          operator: covenant.operator || '>=',
          threshold_value: Number(covenant.threshold_value) || 0,
          threshold_unit: covenant.threshold_unit || '',
          check_frequency: covenant.check_frequency || 'quarterly',
          covenant_clause: covenant.covenant_clause || '',
          confidence_score: Number(covenant.confidence_score) || 0.5,
        })),
        summary: parsed.summary || 'Covenant extraction completed',
      };
    } catch (error) {
      console.error('Failed to parse covenant extraction response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Parse risk analysis response
   */
  private parseRiskAnalysisResponse(response: GeminiResponse): RiskAssessment {
    try {
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);

      return {
        risk_score: Number(parsed.risk_score) || 5,
        risk_factors: Array.isArray(parsed.risk_factors) ? parsed.risk_factors : [],
        recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [],
        assessment_summary: parsed.assessment_summary || 'Risk analysis completed',
        confidence_level: Number(parsed.confidence_level) || 0.5,
      };
    } catch (error) {
      console.error('Failed to parse risk analysis response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Parse adverse event response
   */
  private parseAdverseEventResponse(response: GeminiResponse): {
    risk_score: number;
    impact_assessment: string;
    affected_covenants: string[];
    recommended_actions: string[];
  } {
    try {
      const text = response.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);

      return {
        risk_score: Number(parsed.risk_score) || 5,
        impact_assessment: parsed.impact_assessment || 'Impact analysis completed',
        affected_covenants: Array.isArray(parsed.affected_covenants) ? parsed.affected_covenants : [],
        recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [],
      };
    } catch (error) {
      console.error('Failed to parse adverse event response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Health check for Gemini API
   */
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.callGeminiAPI('Test connection', {
        maxOutputTokens: 10,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export default geminiService;