/**
 * CovenantAgentAnalysis Component
 * Displays AI-powered covenant analysis from the Xano Covenant Analysis Agent
 * Uses free Gemini credits via Xano Test Model
 */

import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  RefreshCw,
  FileText,
} from 'lucide-react';
import Button from '../common/Button';
import { useCovenantAnalysisAgent, AgentAnalysisResult } from '../../hooks/useCovenantAnalysisAgent';

interface CovenantAgentAnalysisProps {
  contractId: number | string;
  onAnalysisComplete?: (result: AgentAnalysisResult) => void;
}

const CovenantAgentAnalysis: React.FC<CovenantAgentAnalysisProps> = ({
  contractId,
  onAnalysisComplete,
}) => {
  const {
    isAnalyzing,
    isFetchingData,
    analysisResult,
    covenantData,
    error,
    runAnalysis,
    fetchCovenantData,
    clearResults,
  } = useCovenantAnalysisAgent();

  const handleRunAnalysis = async () => {
    const result = await runAnalysis(contractId);
    if (result && onAnalysisComplete) {
      onAnalysisComplete(result);
    }
  };

  const handleFetchData = async () => {
    await fetchCovenantData(contractId);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white" />
            <h3 className="font-semibold text-white">AI Covenant Analysis</h3>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              Powered by Gemini
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchData}
              isLoading={isFetchingData}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <FileText className="h-4 w-4 mr-1" />
              Fetch Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAnalysis}
              isLoading={isAnalyzing}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {analysisResult ? 'Re-analyze' : 'Run Analysis'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Error State */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Analysis Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearResults}
                  className="mt-2 text-red-600"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Clear & Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Covenant Data Preview */}
        {covenantData && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Covenant Data Retrieved ({covenantData.covenants?.length || 0} covenants)
            </p>
            {covenantData.covenants && covenantData.covenants.length > 0 && (
              <div className="space-y-1">
                {covenantData.covenants.slice(0, 3).map((cov, idx) => (
                  <div key={idx} className="text-xs text-blue-700 flex justify-between">
                    <span>{cov.covenant_name}</span>
                    <span>
                      {cov.current_value?.toFixed(2)} / {cov.threshold_value?.toFixed(2)}
                    </span>
                  </div>
                ))}
                {covenantData.covenants.length > 3 && (
                  <p className="text-xs text-blue-500">
                    +{covenantData.covenants.length - 3} more...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3" />
            <p className="text-sm text-gray-600">Analyzing covenants with AI...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Analysis Result */}
        {analysisResult && !isAnalyzing && (
          <div className="space-y-4">
            {/* Risk Level Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRiskIcon(analysisResult.risk_level)}
                <div>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(
                      analysisResult.risk_level
                    )}`}
                  >
                    {analysisResult.risk_level.toUpperCase()} RISK
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Covenants Analyzed</p>
                <p className="text-lg font-bold text-gray-900">
                  {analysisResult.covenants_analyzed}
                </p>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                Compliance Status
              </p>
              <p className="text-sm text-gray-800">{analysisResult.compliance_status}</p>
            </div>

            {/* Analysis Summary */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-xs font-medium text-purple-600 uppercase mb-2">
                AI Analysis
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {analysisResult.analysis}
              </p>
            </div>

            {/* Recommendations */}
            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-medium text-gray-700">Recommendations</p>
                </div>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm bg-blue-50 rounded-lg p-2 border border-blue-100"
                    >
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-blue-800">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!analysisResult && !isAnalyzing && !error && !covenantData && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No analysis yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Click "Run Analysis" to get AI-powered covenant insights
            </p>
            <Button variant="primary" onClick={handleRunAnalysis}>
              <Sparkles className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CovenantAgentAnalysis;
