/**
 * useCovenantAnalysisAgent Hook
 * React hook for interacting with the Xano Covenant Analysis AI Agent
 * Provides covenant analysis, breach detection, and risk assessment
 */

import { useState, useCallback } from 'react';
import { xanoIntegrationService } from '../services/xanoIntegration';

export interface AgentAnalysisResult {
  analysis: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_status: string;
  recommendations: string[];
  covenants_analyzed: number;
}

export interface CovenantDataResult {
  covenants: Array<{
    id: number;
    contract_id: number;
    covenant_name: string;
    threshold_value: number;
    current_value: number;
    status: string;
  }>;
}

interface UseCovenantAnalysisAgentReturn {
  // State
  isAnalyzing: boolean;
  isFetchingData: boolean;
  analysisResult: AgentAnalysisResult | null;
  covenantData: CovenantDataResult | null;
  error: string | null;

  // Actions
  runAnalysis: (contractId: number | string, customPrompt?: string) => Promise<AgentAnalysisResult | null>;
  fetchCovenantData: (contractId: number | string) => Promise<CovenantDataResult | null>;
  clearResults: () => void;
}

export function useCovenantAnalysisAgent(): UseCovenantAnalysisAgentReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AgentAnalysisResult | null>(null);
  const [covenantData, setCovenantData] = useState<CovenantDataResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Run the Covenant Analysis Agent
   * Falls back to local analysis if the AI agent endpoint is not available
   */
  const runAnalysis = useCallback(async (
    contractId: number | string,
    customPrompt?: string
  ): Promise<AgentAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Try the AI agent first
      const result = await xanoIntegrationService.runCovenantAnalysisAgent(
        contractId,
        customPrompt
      );
      setAnalysisResult(result);
      return result;
    } catch (agentErr) {
      console.warn('AI Agent not available, falling back to local analysis:', agentErr);
      
      // Fallback: Fetch covenant data and analyze locally
      try {
        const covenantData = await xanoIntegrationService.testGetCovenantDataTool(contractId);
        if (covenantData.covenants && covenantData.covenants.length > 0) {
          const localResult = xanoIntegrationService.analyzeCovenantDataLocally(covenantData.covenants);
          setAnalysisResult(localResult);
          setCovenantData(covenantData);
          return localResult;
        } else {
          setError('No covenants found for this contract');
          return null;
        }
      } catch (dataErr) {
        const errorMessage = dataErr instanceof Error ? dataErr.message : 'Failed to analyze covenants';
        setError(errorMessage);
        console.error('Covenant analysis error:', dataErr);
        return null;
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Fetch covenant data directly using the get_covenant_data tool
   */
  const fetchCovenantData = useCallback(async (
    contractId: number | string
  ): Promise<CovenantDataResult | null> => {
    setIsFetchingData(true);
    setError(null);

    try {
      const result = await xanoIntegrationService.testGetCovenantDataTool(contractId);
      setCovenantData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch covenant data';
      setError(errorMessage);
      console.error('Fetch covenant data error:', err);
      return null;
    } finally {
      setIsFetchingData(false);
    }
  }, []);

  /**
   * Clear all results and errors
   */
  const clearResults = useCallback(() => {
    setAnalysisResult(null);
    setCovenantData(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    isFetchingData,
    analysisResult,
    covenantData,
    error,
    runAnalysis,
    fetchCovenantData,
    clearResults,
  };
}

export default useCovenantAnalysisAgent;
