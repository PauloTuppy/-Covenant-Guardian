/**
 * Adverse Event Monitoring Service
 * Handles news/event ingestion, Gemini AI risk analysis, and risk score aggregation
 */

import { apiService } from './api';
import { geminiService } from './gemini';
import { alertService } from './alerts';
import { API_ENDPOINTS } from '@/config/api';
import type { AdverseEvent, Covenant, RiskAssessment } from '@/types';

export interface AdverseEventInput {
  borrower_id: string;
  event_type: 'news' | 'regulatory' | 'credit_rating_downgrade' | 'executive_change' | 'litigation' | 'other';
  headline: string;
  description?: string;
  source_url?: string;
  event_date: string;
}

export interface RiskScoreAggregation {
  borrower_id: string;
  total_events: number;
  aggregate_risk_score: number;
  risk_factors: string[];
  highest_risk_event?: AdverseEvent;
  risk_trend: 'increasing' | 'stable' | 'decreasing';
  last_calculated: string;
}

export interface EventCovenantLink {
  event_id: string;
  covenant_id: string;
  impact_assessment: string;
  risk_contribution: number;
}

class AdverseEventService {
  /**
   * Ingest a new adverse event
   * Property 9: Adverse Event Processing
   * Stores event details with risk scoring
   */
  async ingestEvent(input: AdverseEventInput): Promise<AdverseEvent> {
    // Analyze event with Gemini AI for risk scoring
    const riskAssessment = await this.analyzeEventRisk(input);
    
    // Store event with risk score
    const eventData = {
      ...input,
      risk_score: riskAssessment.risk_score,
      gemini_analyzed: true,
    };

    const response = await apiService.post<AdverseEvent>(
      API_ENDPOINTS.adverseEvents?.list || '/adverse-events',
      eventData
    );

    if (!response.data) {
      throw new Error('Failed to store adverse event');
    }

    const storedEvent = response.data;

    // If high-risk event, create alerts for affected covenants
    if (riskAssessment.risk_score >= 7) {
      await this.createAlertsForHighRiskEvent(storedEvent, riskAssessment);
    }

    return storedEvent;
  }


  /**
   * Analyze event risk using Gemini AI
   */
  async analyzeEventRisk(
    event: AdverseEventInput,
    borrowerContext?: { borrower_name: string; industry?: string }
  ): Promise<RiskAssessment> {
    try {
      const geminiResult = await geminiService.analyzeAdverseEvent(
        {
          event_type: event.event_type,
          headline: event.headline,
          description: event.description || '',
        },
        borrowerContext || { borrower_name: 'Unknown Borrower' }
      );
      
      // Convert Gemini response to RiskAssessment format
      return {
        risk_score: geminiResult.risk_score,
        risk_factors: geminiResult.affected_covenants.length > 0 
          ? geminiResult.affected_covenants.map(c => `Affects: ${c}`)
          : ['General risk identified'],
        recommended_actions: geminiResult.recommended_actions,
        assessment_summary: geminiResult.impact_assessment,
        confidence_level: 0.8,
      };
    } catch (error) {
      // Return default assessment if Gemini fails
      return {
        risk_score: 5,
        risk_factors: ['Unable to analyze - manual review required'],
        recommended_actions: ['Review event manually'],
        assessment_summary: 'Automated analysis unavailable',
        confidence_level: 0.1,
      };
    }
  }

  /**
   * Create alerts for high-risk events linking to affected covenants
   * Property 9: Creates alerts linking high-risk events to affected covenants
   */
  async createAlertsForHighRiskEvent(
    event: AdverseEvent,
    riskAssessment: RiskAssessment
  ): Promise<void> {
    // Get covenants for the borrower
    const covenants = await this.getCovenantsByBorrower(event.borrower_id);

    for (const covenant of covenants) {
      // Determine if this event type affects this covenant
      const impactLevel = this.assessEventImpactOnCovenant(event, covenant);
      
      if (impactLevel >= 0.5) {
        await alertService.createAlert({
          covenant_id: covenant.id,
          contract_id: covenant.contract_id,
          alert_type: 'warning',
          severity: riskAssessment.risk_score >= 8 ? 'high' : 'medium',
          title: `Adverse Event: ${event.headline}`,
          description: `${event.event_type} event detected for borrower. ${riskAssessment.assessment_summary}`,
          trigger_metric_value: riskAssessment.risk_score,
          threshold_value: 7,
        });
      }
    }
  }

  /**
   * Assess how much an event impacts a specific covenant
   */
  assessEventImpactOnCovenant(event: AdverseEvent, covenant: Covenant): number {
    // Financial covenants are more affected by credit/regulatory events
    const impactMatrix: Record<string, Record<string, number>> = {
      financial: {
        credit_rating_downgrade: 0.9,
        regulatory: 0.7,
        litigation: 0.6,
        news: 0.4,
        executive_change: 0.3,
        other: 0.2,
      },
      operational: {
        executive_change: 0.8,
        regulatory: 0.7,
        litigation: 0.5,
        news: 0.4,
        credit_rating_downgrade: 0.3,
        other: 0.2,
      },
      reporting: {
        regulatory: 0.8,
        litigation: 0.6,
        executive_change: 0.5,
        news: 0.3,
        credit_rating_downgrade: 0.3,
        other: 0.2,
      },
      other: {
        news: 0.5,
        regulatory: 0.5,
        litigation: 0.5,
        executive_change: 0.5,
        credit_rating_downgrade: 0.5,
        other: 0.3,
      },
    };

    const covenantType = covenant.covenant_type || 'other';
    const eventType = event.event_type || 'other';
    
    return impactMatrix[covenantType]?.[eventType] ?? 0.3;
  }

  /**
   * Get covenants for a borrower
   */
  async getCovenantsByBorrower(borrowerId: string): Promise<Covenant[]> {
    const response = await apiService.get<Covenant[]>(
      `/covenants?borrower_id=${borrowerId}`
    );
    return response.data || [];
  }

  /**
   * Get all adverse events for a borrower
   */
  async getEventsByBorrower(borrowerId: string): Promise<AdverseEvent[]> {
    const response = await apiService.get<AdverseEvent[]>(
      `/adverse-events?borrower_id=${borrowerId}`
    );
    return response.data || [];
  }

  /**
   * Get a single adverse event by ID
   */
  async getEvent(eventId: string): Promise<AdverseEvent> {
    const response = await apiService.get<AdverseEvent>(
      `/adverse-events/${eventId}`
    );
    if (!response.data) {
      throw new Error('Adverse event not found');
    }
    return response.data;
  }

  /**
   * Aggregate risk scores for a borrower
   * Property 10: Risk Score Aggregation
   * Aggregates individual risk scores into a comprehensive assessment
   */
  async aggregateRiskScores(borrowerId: string): Promise<RiskScoreAggregation> {
    const events = await this.getEventsByBorrower(borrowerId);
    
    if (events.length === 0) {
      return {
        borrower_id: borrowerId,
        total_events: 0,
        aggregate_risk_score: 0,
        risk_factors: [],
        risk_trend: 'stable',
        last_calculated: new Date().toISOString(),
      };
    }

    // Calculate weighted aggregate risk score
    const aggregateScore = this.calculateWeightedRiskScore(events);
    
    // Identify risk factors from all events
    const riskFactors = this.extractRiskFactors(events);
    
    // Find highest risk event
    const highestRiskEvent = events.reduce((max, event) => 
      (event.risk_score || 0) > (max.risk_score || 0) ? event : max
    , events[0]);

    // Determine risk trend
    const riskTrend = this.calculateRiskTrend(events);

    return {
      borrower_id: borrowerId,
      total_events: events.length,
      aggregate_risk_score: aggregateScore,
      risk_factors: riskFactors,
      highest_risk_event: highestRiskEvent,
      risk_trend: riskTrend,
      last_calculated: new Date().toISOString(),
    };
  }

  /**
   * Calculate weighted risk score from multiple events
   * More recent events and higher severity events have more weight
   */
  calculateWeightedRiskScore(events: AdverseEvent[]): number {
    if (events.length === 0) return 0;

    const now = Date.now();
    let totalWeight = 0;
    let weightedSum = 0;

    for (const event of events) {
      const eventDate = new Date(event.event_date).getTime();
      const daysSinceEvent = Math.max(1, (now - eventDate) / (1000 * 60 * 60 * 24));
      
      // Recency weight: more recent events have higher weight (decay over 90 days)
      const recencyWeight = Math.max(0.1, 1 - (daysSinceEvent / 90));
      
      // Severity weight: higher risk scores have more weight
      const severityWeight = (event.risk_score || 5) / 10;
      
      // Combined weight
      const weight = recencyWeight * (0.5 + 0.5 * severityWeight);
      
      totalWeight += weight;
      weightedSum += (event.risk_score || 5) * weight;
    }

    // Normalize to 1-10 scale
    const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 5;
    
    // Apply event count multiplier (more events = higher risk, capped)
    const eventCountMultiplier = Math.min(1.5, 1 + (events.length - 1) * 0.1);
    
    return Math.min(10, Math.max(1, baseScore * eventCountMultiplier));
  }

  /**
   * Extract unique risk factors from all events
   */
  extractRiskFactors(events: AdverseEvent[]): string[] {
    const factors = new Set<string>();
    
    for (const event of events) {
      // Add event type as a risk factor
      factors.add(`${event.event_type} event detected`);
      
      // Add high-risk indicator if applicable
      if ((event.risk_score || 0) >= 7) {
        factors.add(`High-risk ${event.event_type} event`);
      }
    }
    
    return Array.from(factors);
  }

  /**
   * Calculate risk trend based on recent vs older events
   */
  calculateRiskTrend(events: AdverseEvent[]): 'increasing' | 'stable' | 'decreasing' {
    if (events.length < 2) return 'stable';

    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Split events into recent (last 30 days) and older
    const recentEvents = events.filter(e => 
      new Date(e.event_date).getTime() > thirtyDaysAgo
    );
    const olderEvents = events.filter(e => 
      new Date(e.event_date).getTime() <= thirtyDaysAgo
    );

    // Calculate average risk for each period
    const recentAvg = recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + (e.risk_score || 5), 0) / recentEvents.length
      : 0;
    const olderAvg = olderEvents.length > 0
      ? olderEvents.reduce((sum, e) => sum + (e.risk_score || 5), 0) / olderEvents.length
      : 0;

    // Determine trend
    if (recentEvents.length === 0 && olderEvents.length > 0) {
      return 'decreasing';
    }
    if (recentEvents.length > 0 && olderEvents.length === 0) {
      return 'increasing';
    }
    
    const difference = recentAvg - olderAvg;
    if (difference > 1) return 'increasing';
    if (difference < -1) return 'decreasing';
    return 'stable';
  }

  /**
   * Batch ingest multiple events
   */
  async batchIngestEvents(events: AdverseEventInput[]): Promise<AdverseEvent[]> {
    const results: AdverseEvent[] = [];
    
    for (const event of events) {
      try {
        const storedEvent = await this.ingestEvent(event);
        results.push(storedEvent);
      } catch (error) {
        console.error(`Failed to ingest event: ${event.headline}`, error);
      }
    }
    
    return results;
  }

  /**
   * Get risk summary for dashboard
   */
  async getRiskSummary(bankId: string): Promise<{
    total_events: number;
    high_risk_events: number;
    borrowers_with_events: number;
    average_risk_score: number;
  }> {
    const response = await apiService.get<AdverseEvent[]>(
      `/adverse-events?bank_id=${bankId}`
    );
    const events = response.data || [];

    const highRiskEvents = events.filter(e => (e.risk_score || 0) >= 7);
    const uniqueBorrowers = new Set(events.map(e => e.borrower_id));
    const avgRisk = events.length > 0
      ? events.reduce((sum, e) => sum + (e.risk_score || 5), 0) / events.length
      : 0;

    return {
      total_events: events.length,
      high_risk_events: highRiskEvents.length,
      borrowers_with_events: uniqueBorrowers.size,
      average_risk_score: avgRisk,
    };
  }
}

export const adverseEventService = new AdverseEventService();
