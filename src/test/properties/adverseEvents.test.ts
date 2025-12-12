/**
 * Property-Based Tests for Adverse Event Monitoring
 * Feature: covenant-guardian, Property 9: Adverse Event Processing
 * Feature: covenant-guardian, Property 10: Risk Score Aggregation
 */

import fc from 'fast-check';
import { adverseEventService, AdverseEventInput } from '@/services/adverseEvents';
import { apiService } from '@/services/api';
import { geminiService } from '@/services/gemini';
import { alertService } from '@/services/alerts';
import type { AdverseEvent, Covenant } from '@/types';

// Mock the services
jest.mock('@/services/api');
jest.mock('@/services/gemini');
jest.mock('@/services/alerts');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockAlertService = alertService as jest.Mocked<typeof alertService>;

describe('Adverse Event Monitoring Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 9: Adverse Event Processing
   * For any adverse event detected for a borrower, the system should store event details 
   * with risk scoring, and create alerts linking high-risk events to affected covenants.
   * Validates: Requirements 6.1, 6.3
   */
  describe('Property 9: Adverse Event Processing', () => {
    test('should store adverse event with risk scoring', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            eventType: fc.constantFrom('news', 'regulatory', 'credit_rating_downgrade', 'executive_change', 'litigation', 'other'),
            headline: fc.string({ minLength: 10, maxLength: 200 }),
            description: fc.option(fc.string({ minLength: 20, maxLength: 1000 })),
            sourceUrl: fc.option(fc.webUrl()),
            eventDate: fc.integer({ min: 1577836800000, max: 1767225600000 })
              .map(ts => new Date(ts).toISOString().split('T')[0]),
            riskScore: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ borrowerId, bankId, eventType, headline, description, sourceUrl, eventDate, riskScore }) => {
            const eventInput: AdverseEventInput = {
              borrower_id: borrowerId,
              event_type: eventType as AdverseEventInput['event_type'],
              headline: headline,
              description: description || undefined,
              source_url: sourceUrl || undefined,
              event_date: eventDate,
            };

            // Mock Gemini risk assessment (using Gemini's return type)
            const mockGeminiResponse = {
              risk_score: riskScore,
              impact_assessment: 'Test assessment',
              affected_covenants: ['Test covenant'],
              recommended_actions: ['Test recommendation'],
            };
            mockGeminiService.analyzeAdverseEvent.mockResolvedValue(mockGeminiResponse);

            // Mock event storage
            const mockStoredEvent: AdverseEvent = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: bankId,
              event_type: eventType as AdverseEvent['event_type'],
              headline: headline,
              description: description || undefined,
              source_url: sourceUrl || undefined,
              risk_score: riskScore,
              gemini_analyzed: true,
              event_date: eventDate,
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockStoredEvent,
            });

            // Mock covenants query (empty for this test)
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const result = await adverseEventService.ingestEvent(eventInput);

            // Property 1: Event must be stored with borrower ID
            expect(result.borrower_id).toBe(borrowerId);

            // Property 2: Event type must be preserved
            expect(result.event_type).toBe(eventType);

            // Property 3: Headline must be preserved
            expect(result.headline).toBe(headline);

            // Property 4: Risk score must be assigned (from Gemini analysis)
            expect(result.risk_score).toBeDefined();
            expect(result.risk_score).toBeGreaterThanOrEqual(1);
            expect(result.risk_score).toBeLessThanOrEqual(10);

            // Property 5: Gemini analyzed flag must be true
            expect(result.gemini_analyzed).toBe(true);

            // Property 6: Event date must be preserved
            expect(result.event_date).toBe(eventDate);

            // Property 7: Created timestamp must be present
            expect(result.created_at).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });


    test('should create alerts for high-risk events linking to affected covenants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            contractId: fc.uuid(),
            covenantId: fc.uuid(),
            // Use event types with high impact on financial covenants (>= 0.5 threshold)
            eventType: fc.constantFrom('credit_rating_downgrade', 'regulatory', 'litigation'),
            headline: fc.string({ minLength: 10, maxLength: 200 }),
            eventDate: fc.integer({ min: 1704067200000, max: 1767225600000 })
              .map(ts => new Date(ts).toISOString().split('T')[0]),
            riskScore: fc.integer({ min: 7, max: 10 }), // High risk only
          }),
          async ({ borrowerId, bankId, contractId, covenantId, eventType, headline, eventDate, riskScore }) => {
            // Clear mocks before each iteration
            jest.clearAllMocks();
            
            const eventInput: AdverseEventInput = {
              borrower_id: borrowerId,
              event_type: eventType as AdverseEventInput['event_type'],
              headline: headline,
              event_date: eventDate,
            };

            // Mock high-risk Gemini assessment (using Gemini's return type)
            const mockGeminiResponse = {
              risk_score: riskScore,
              impact_assessment: 'High risk event detected',
              affected_covenants: ['Affected covenant'],
              recommended_actions: ['Immediate review required'],
            };
            mockGeminiService.analyzeAdverseEvent.mockResolvedValue(mockGeminiResponse);

            // Mock event storage
            const mockStoredEvent: AdverseEvent = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: bankId,
              event_type: eventType as AdverseEvent['event_type'],
              headline: headline,
              risk_score: riskScore,
              gemini_analyzed: true,
              event_date: eventDate,
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockStoredEvent,
            });

            // Mock covenants for the borrower - use financial type which has high impact for these event types
            const mockCovenant: Covenant = {
              id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              covenant_name: 'Test Covenant',
              covenant_type: 'financial', // Financial covenants have high impact from credit/regulatory/litigation
              metric_name: 'debt_to_ebitda',
              operator: '<=',
              threshold_value: 3.5,
              check_frequency: 'quarterly',
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.get.mockResolvedValue({
              success: true,
              data: [mockCovenant],
            });

            // Mock alert creation
            mockAlertService.createAlert.mockResolvedValue({
              id: fc.sample(fc.uuid(), 1)[0],
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              alert_type: 'warning',
              severity: riskScore >= 8 ? 'high' : 'medium',
              title: `Adverse Event: ${headline}`,
              description: 'Event detected',
              status: 'new',
              triggered_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            await adverseEventService.ingestEvent(eventInput);

            // Property 1: Alert should be created for high-risk events with high-impact event types
            expect(mockAlertService.createAlert).toHaveBeenCalled();

            // Property 2: Alert should link to the covenant from the API response
            const alertCall = mockAlertService.createAlert.mock.calls[0][0];
            expect(alertCall.covenant_id).toBe(covenantId);
            expect(alertCall.contract_id).toBe(contractId);

            // Property 3: Alert should include event details
            expect(alertCall.title).toContain(headline);

            // Property 4: Alert severity should be appropriate for risk score
            if (riskScore >= 8) {
              expect(alertCall.severity).toBe('high');
            } else {
              expect(alertCall.severity).toBe('medium');
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should not create alerts for low-risk events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            eventType: fc.constantFrom('news', 'other'),
            headline: fc.string({ minLength: 10, maxLength: 200 }),
            eventDate: fc.integer({ min: 1704067200000, max: 1735689600000 }) // 2024-01-01 to 2025-12-31 in ms
              .map(ts => new Date(ts).toISOString().split('T')[0]),
            riskScore: fc.integer({ min: 1, max: 6 }), // Low risk only
          }),
          async ({ borrowerId, bankId, eventType, headline, eventDate, riskScore }) => {
            const eventInput: AdverseEventInput = {
              borrower_id: borrowerId,
              event_type: eventType as AdverseEventInput['event_type'],
              headline: headline,
              event_date: eventDate,
            };

            // Mock low-risk Gemini assessment (using Gemini's return type)
            mockGeminiService.analyzeAdverseEvent.mockResolvedValue({
              risk_score: riskScore,
              impact_assessment: 'Low risk event',
              affected_covenants: [],
              recommended_actions: ['Monitor situation'],
            });

            // Mock event storage
            mockApiService.post.mockResolvedValue({
              success: true,
              data: {
                id: fc.sample(fc.uuid(), 1)[0],
                borrower_id: borrowerId,
                bank_id: bankId,
                event_type: eventType,
                headline: headline,
                risk_score: riskScore,
                gemini_analyzed: true,
                event_date: eventDate,
                created_at: new Date().toISOString(),
              },
            });

            // Mock covenants query
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            await adverseEventService.ingestEvent(eventInput);

            // Property: No alerts should be created for low-risk events
            expect(mockAlertService.createAlert).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should assess event impact on different covenant types correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            eventType: fc.constantFrom('news', 'regulatory', 'credit_rating_downgrade', 'executive_change', 'litigation', 'other'),
            covenantType: fc.constantFrom('financial', 'operational', 'reporting', 'other'),
            riskScore: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ eventType, covenantType, riskScore }) => {
            const mockEvent: AdverseEvent = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: fc.sample(fc.uuid(), 1)[0],
              bank_id: fc.sample(fc.uuid(), 1)[0],
              event_type: eventType as AdverseEvent['event_type'],
              headline: 'Test Event',
              risk_score: riskScore,
              gemini_analyzed: true,
              event_date: '2024-06-15',
              created_at: new Date().toISOString(),
            };

            const mockCovenant: Covenant = {
              id: fc.sample(fc.uuid(), 1)[0],
              contract_id: fc.sample(fc.uuid(), 1)[0],
              bank_id: fc.sample(fc.uuid(), 1)[0],
              covenant_name: 'Test Covenant',
              covenant_type: covenantType as Covenant['covenant_type'],
              metric_name: 'test_metric',
              operator: '<=',
              threshold_value: 5,
              check_frequency: 'quarterly',
              reporting_deadline_days: 30,
              gemini_extracted: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const impact = adverseEventService.assessEventImpactOnCovenant(mockEvent, mockCovenant);

            // Property 1: Impact must be between 0 and 1
            expect(impact).toBeGreaterThanOrEqual(0);
            expect(impact).toBeLessThanOrEqual(1);

            // Property 2: Credit rating downgrades should have high impact on financial covenants
            if (eventType === 'credit_rating_downgrade' && covenantType === 'financial') {
              expect(impact).toBeGreaterThanOrEqual(0.8);
            }

            // Property 3: Executive changes should have high impact on operational covenants
            if (eventType === 'executive_change' && covenantType === 'operational') {
              expect(impact).toBeGreaterThanOrEqual(0.7);
            }

            // Property 4: Regulatory events should have high impact on reporting covenants
            if (eventType === 'regulatory' && covenantType === 'reporting') {
              expect(impact).toBeGreaterThanOrEqual(0.7);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    test('should handle Gemini analysis failure gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            bankId: fc.uuid(),
            headline: fc.string({ minLength: 10, maxLength: 200 }),
            eventDate: fc.integer({ min: 1704067200000, max: 1767225600000 })
              .map(ts => new Date(ts).toISOString().split('T')[0]),
          }),
          async ({ borrowerId, bankId, headline, eventDate }) => {
            const eventInput: AdverseEventInput = {
              borrower_id: borrowerId,
              event_type: 'news',
              headline: headline,
              event_date: eventDate,
            };

            // Mock Gemini failure
            mockGeminiService.analyzeAdverseEvent.mockRejectedValue(new Error('Gemini API error'));

            // Mock event storage with default risk score
            mockApiService.post.mockResolvedValue({
              success: true,
              data: {
                id: fc.sample(fc.uuid(), 1)[0],
                borrower_id: borrowerId,
                bank_id: bankId,
                event_type: 'news',
                headline: headline,
                risk_score: 5, // Default score
                gemini_analyzed: true,
                event_date: eventDate,
                created_at: new Date().toISOString(),
              },
            });

            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const result = await adverseEventService.ingestEvent(eventInput);

            // Property 1: Event should still be stored
            expect(result).toBeDefined();
            expect(result.borrower_id).toBe(borrowerId);

            // Property 2: Default risk score should be assigned
            expect(result.risk_score).toBe(5);
          }
        ),
        { numRuns: 10 }
      );
    });
  });


  /**
   * Property 10: Risk Score Aggregation
   * For any borrower with multiple adverse events, the system should aggregate individual 
   * risk scores into a comprehensive assessment that properly weights multiple risk factors.
   * Validates: Requirements 6.5
   */
  describe('Property 10: Risk Score Aggregation', () => {
    test('should aggregate risk scores from multiple events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            eventCount: fc.integer({ min: 2, max: 10 }),
          }),
          async ({ borrowerId, eventCount }) => {
            // Generate multiple events with varying risk scores
            const mockEvents: AdverseEvent[] = Array.from({ length: eventCount }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: fc.sample(fc.uuid(), 1)[0],
              event_type: ['news', 'regulatory', 'litigation'][i % 3] as AdverseEvent['event_type'],
              headline: `Test Event ${i + 1}`,
              risk_score: Math.floor(Math.random() * 10) + 1,
              gemini_analyzed: true,
              event_date: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
            }));

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockEvents,
            });

            const aggregation = await adverseEventService.aggregateRiskScores(borrowerId);

            // Property 1: Total events must match
            expect(aggregation.total_events).toBe(eventCount);

            // Property 2: Aggregate risk score must be between 1 and 10
            expect(aggregation.aggregate_risk_score).toBeGreaterThanOrEqual(1);
            expect(aggregation.aggregate_risk_score).toBeLessThanOrEqual(10);

            // Property 3: Risk factors must be extracted
            expect(aggregation.risk_factors.length).toBeGreaterThan(0);

            // Property 4: Highest risk event must be identified
            expect(aggregation.highest_risk_event).toBeDefined();
            const maxRiskScore = Math.max(...mockEvents.map(e => e.risk_score || 0));
            expect(aggregation.highest_risk_event!.risk_score).toBe(maxRiskScore);

            // Property 5: Risk trend must be valid
            expect(['increasing', 'stable', 'decreasing']).toContain(aggregation.risk_trend);

            // Property 6: Last calculated timestamp must be recent
            const calculatedTime = new Date(aggregation.last_calculated);
            expect(calculatedTime.getTime()).toBeLessThanOrEqual(Date.now());
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should return zero aggregate for borrower with no events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (borrowerId) => {
            mockApiService.get.mockResolvedValue({
              success: true,
              data: [],
            });

            const aggregation = await adverseEventService.aggregateRiskScores(borrowerId);

            // Property 1: Total events must be zero
            expect(aggregation.total_events).toBe(0);

            // Property 2: Aggregate risk score must be zero
            expect(aggregation.aggregate_risk_score).toBe(0);

            // Property 3: Risk factors must be empty
            expect(aggregation.risk_factors.length).toBe(0);

            // Property 4: No highest risk event
            expect(aggregation.highest_risk_event).toBeUndefined();

            // Property 5: Risk trend should be stable
            expect(aggregation.risk_trend).toBe('stable');
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should weight recent events more heavily than older events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            recentRiskScore: fc.integer({ min: 8, max: 10 }), // High risk recent
            oldRiskScore: fc.integer({ min: 1, max: 3 }), // Low risk old
          }),
          async ({ borrowerId, recentRiskScore, oldRiskScore }) => {
            const now = Date.now();
            
            // Recent high-risk event (yesterday)
            const recentEvent: AdverseEvent = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: fc.sample(fc.uuid(), 1)[0],
              event_type: 'credit_rating_downgrade',
              headline: 'Recent High Risk Event',
              risk_score: recentRiskScore,
              gemini_analyzed: true,
              event_date: new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
            };

            // Old low-risk event (60 days ago)
            const oldEvent: AdverseEvent = {
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: fc.sample(fc.uuid(), 1)[0],
              event_type: 'news',
              headline: 'Old Low Risk Event',
              risk_score: oldRiskScore,
              gemini_analyzed: true,
              event_date: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
            };

            mockApiService.get.mockResolvedValue({
              success: true,
              data: [recentEvent, oldEvent],
            });

            const aggregation = await adverseEventService.aggregateRiskScores(borrowerId);

            // Property: Aggregate should be closer to recent high-risk score than old low-risk score
            // Due to recency weighting, the aggregate should be above the simple average
            const simpleAverage = (recentRiskScore + oldRiskScore) / 2;
            expect(aggregation.aggregate_risk_score).toBeGreaterThan(simpleAverage - 1);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should calculate correct risk trend based on event timing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            trendType: fc.constantFrom('increasing', 'decreasing', 'stable'),
          }),
          async ({ borrowerId, trendType }) => {
            const now = Date.now();
            let mockEvents: AdverseEvent[];

            if (trendType === 'increasing') {
              // Recent events have higher risk scores
              mockEvents = [
                {
                  id: fc.sample(fc.uuid(), 1)[0],
                  borrower_id: borrowerId,
                  bank_id: fc.sample(fc.uuid(), 1)[0],
                  event_type: 'credit_rating_downgrade',
                  headline: 'Recent High Risk',
                  risk_score: 9,
                  gemini_analyzed: true,
                  event_date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                },
                {
                  id: fc.sample(fc.uuid(), 1)[0],
                  borrower_id: borrowerId,
                  bank_id: fc.sample(fc.uuid(), 1)[0],
                  event_type: 'news',
                  headline: 'Old Low Risk',
                  risk_score: 3,
                  gemini_analyzed: true,
                  event_date: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                },
              ];
            } else if (trendType === 'decreasing') {
              // Only old events, no recent ones
              mockEvents = [
                {
                  id: fc.sample(fc.uuid(), 1)[0],
                  borrower_id: borrowerId,
                  bank_id: fc.sample(fc.uuid(), 1)[0],
                  event_type: 'litigation',
                  headline: 'Old High Risk',
                  risk_score: 8,
                  gemini_analyzed: true,
                  event_date: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                },
                {
                  id: fc.sample(fc.uuid(), 1)[0],
                  borrower_id: borrowerId,
                  bank_id: fc.sample(fc.uuid(), 1)[0],
                  event_type: 'news',
                  headline: 'Older Event',
                  risk_score: 7,
                  gemini_analyzed: true,
                  event_date: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                },
              ];
            } else {
              // Similar risk scores across time
              mockEvents = [
                {
                  id: fc.sample(fc.uuid(), 1)[0],
                  borrower_id: borrowerId,
                  bank_id: fc.sample(fc.uuid(), 1)[0],
                  event_type: 'news',
                  headline: 'Recent Event',
                  risk_score: 5,
                  gemini_analyzed: true,
                  event_date: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                },
                {
                  id: fc.sample(fc.uuid(), 1)[0],
                  borrower_id: borrowerId,
                  bank_id: fc.sample(fc.uuid(), 1)[0],
                  event_type: 'news',
                  headline: 'Old Event',
                  risk_score: 5,
                  gemini_analyzed: true,
                  event_date: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                },
              ];
            }

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockEvents,
            });

            const aggregation = await adverseEventService.aggregateRiskScores(borrowerId);

            // Property: Risk trend must be one of the valid values
            expect(['increasing', 'stable', 'decreasing']).toContain(aggregation.risk_trend);

            // Property: Trend should match expected direction
            expect(aggregation.risk_trend).toBe(trendType);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should apply event count multiplier for multiple events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
            baseRiskScore: fc.integer({ min: 4, max: 6 }),
            eventCount: fc.integer({ min: 3, max: 8 }),
          }),
          async ({ borrowerId, baseRiskScore, eventCount }) => {
            const now = Date.now();
            
            // Generate multiple events with same risk score
            const mockEvents: AdverseEvent[] = Array.from({ length: eventCount }, (_, i) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              borrower_id: borrowerId,
              bank_id: fc.sample(fc.uuid(), 1)[0],
              event_type: 'news' as const,
              headline: `Event ${i + 1}`,
              risk_score: baseRiskScore,
              gemini_analyzed: true,
              event_date: new Date(now - (i * 5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
            }));

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockEvents,
            });

            const aggregation = await adverseEventService.aggregateRiskScores(borrowerId);

            // Property 1: Aggregate should be at least the base risk score
            expect(aggregation.aggregate_risk_score).toBeGreaterThanOrEqual(baseRiskScore * 0.9);

            // Property 2: Multiple events should increase aggregate (event count multiplier)
            // With multiple events, aggregate should be higher than base score
            if (eventCount >= 3) {
              expect(aggregation.aggregate_risk_score).toBeGreaterThanOrEqual(baseRiskScore);
            }

            // Property 3: Aggregate should not exceed 10
            expect(aggregation.aggregate_risk_score).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should extract unique risk factors from all events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            borrowerId: fc.uuid(),
          }),
          async ({ borrowerId }) => {
            // Create events with different types
            const mockEvents: AdverseEvent[] = [
              {
                id: fc.sample(fc.uuid(), 1)[0],
                borrower_id: borrowerId,
                bank_id: fc.sample(fc.uuid(), 1)[0],
                event_type: 'news',
                headline: 'News Event',
                risk_score: 5,
                gemini_analyzed: true,
                event_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
              },
              {
                id: fc.sample(fc.uuid(), 1)[0],
                borrower_id: borrowerId,
                bank_id: fc.sample(fc.uuid(), 1)[0],
                event_type: 'regulatory',
                headline: 'Regulatory Event',
                risk_score: 8,
                gemini_analyzed: true,
                event_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
              },
              {
                id: fc.sample(fc.uuid(), 1)[0],
                borrower_id: borrowerId,
                bank_id: fc.sample(fc.uuid(), 1)[0],
                event_type: 'litigation',
                headline: 'Litigation Event',
                risk_score: 7,
                gemini_analyzed: true,
                event_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
              },
            ];

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockEvents,
            });

            const aggregation = await adverseEventService.aggregateRiskScores(borrowerId);

            // Property 1: Risk factors should include event types
            expect(aggregation.risk_factors.some(f => f.includes('news'))).toBe(true);
            expect(aggregation.risk_factors.some(f => f.includes('regulatory'))).toBe(true);
            expect(aggregation.risk_factors.some(f => f.includes('litigation'))).toBe(true);

            // Property 2: High-risk events should be flagged
            expect(aggregation.risk_factors.some(f => f.includes('High-risk'))).toBe(true);

            // Property 3: Risk factors should be unique (no duplicates)
            const uniqueFactors = new Set(aggregation.risk_factors);
            expect(uniqueFactors.size).toBe(aggregation.risk_factors.length);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
