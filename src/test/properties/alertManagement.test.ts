/**
 * Property-Based Tests for Alert Management System
 * Feature: covenant-guardian, Property 5: Alert Generation Trigger
 * Feature: covenant-guardian, Property 6: Alert Acknowledgment Workflow
 */

import fc from 'fast-check';
import { alertService, StatusChangeEvent, AlertCreateInput } from '@/services/alerts';
import { apiService } from '@/services/api';
import type { Alert } from '@/types';

// Mock the services
jest.mock('@/services/api');

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Alert Management Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 5: Alert Generation Trigger
   * For any covenant that changes status from compliant to warning or breached,
   * the system should create an alert with appropriate severity (medium/high for warning, 
   * critical for breach) and include covenant details, current values, and threshold information.
   * Validates: Requirements 3.3, 4.1, 4.2, 4.3
   */
  describe('Property 5: Alert Generation Trigger', () => {
    test('should generate alert when covenant status changes from compliant to warning', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            covenantName: fc.string({ minLength: 5, maxLength: 100 }),
            metricName: fc.constantFrom(
              'debt_to_ebitda', 'debt_to_equity', 'current_ratio',
              'interest_coverage', 'roe', 'roa'
            ),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
          }),
          async ({ covenantId, contractId, covenantName, metricName, currentValue, thresholdValue }) => {
            const statusChangeEvent: StatusChangeEvent = {
              covenant_id: covenantId,
              contract_id: contractId,
              previous_status: 'compliant',
              new_status: 'warning',
              current_value: currentValue,
              threshold_value: thresholdValue,
              covenant_name: covenantName,
              metric_name: metricName,
            };

            // Mock alert creation response
            const mockAlert: Alert = {
              id: fc.sample(fc.uuid(), 1)[0],
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: fc.sample(fc.uuid(), 1)[0],
              alert_type: 'warning',
              severity: 'medium',
              title: `Covenant WARNING: ${covenantName}`,
              description: `${covenantName} (${metricName}) has moved from compliant to warning.`,
              trigger_metric_value: currentValue,
              threshold_value: thresholdValue,
              status: 'new',
              triggered_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockAlert,
            });

            const alert = await alertService.generateAlertFromStatusChange(statusChangeEvent);

            // Property 1: Alert must be created for compliant -> warning transition
            expect(alert).not.toBeNull();

            // Property 2: Alert type must be 'warning'
            expect(alert!.alert_type).toBe('warning');

            // Property 3: Severity must be medium or high for warning status
            expect(['low', 'medium', 'high']).toContain(alert!.severity);

            // Property 4: Alert must include covenant details
            expect(alert!.covenant_id).toBe(covenantId);
            expect(alert!.contract_id).toBe(contractId);

            // Property 5: Alert must include current value and threshold
            expect(alert!.trigger_metric_value).toBe(currentValue);
            expect(alert!.threshold_value).toBe(thresholdValue);

            // Property 6: Alert status must be 'new'
            expect(alert!.status).toBe('new');

            // Property 7: Alert must have title and description
            expect(alert!.title).toBeDefined();
            expect(alert!.title.length).toBeGreaterThan(0);
            expect(alert!.description).toBeDefined();
            expect(alert!.description.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });


    test('should generate critical alert when covenant status changes to breached', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            covenantName: fc.string({ minLength: 5, maxLength: 100 }),
            metricName: fc.constantFrom(
              'debt_to_ebitda', 'debt_to_equity', 'current_ratio',
              'interest_coverage', 'roe', 'roa'
            ),
            previousStatus: fc.constantFrom('compliant', 'warning'),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
          }),
          async ({ covenantId, contractId, covenantName, metricName, previousStatus, currentValue, thresholdValue }) => {
            const statusChangeEvent: StatusChangeEvent = {
              covenant_id: covenantId,
              contract_id: contractId,
              previous_status: previousStatus as 'compliant' | 'warning',
              new_status: 'breached',
              current_value: currentValue,
              threshold_value: thresholdValue,
              covenant_name: covenantName,
              metric_name: metricName,
            };

            // Mock alert creation response
            const mockAlert: Alert = {
              id: fc.sample(fc.uuid(), 1)[0],
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: fc.sample(fc.uuid(), 1)[0],
              alert_type: 'breach',
              severity: 'critical',
              title: `Covenant BREACH: ${covenantName}`,
              description: `${covenantName} (${metricName}) has moved from ${previousStatus} to breached.`,
              trigger_metric_value: currentValue,
              threshold_value: thresholdValue,
              status: 'new',
              triggered_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockAlert,
            });

            const alert = await alertService.generateAlertFromStatusChange(statusChangeEvent);

            // Property 1: Alert must be created for any transition to breached
            expect(alert).not.toBeNull();

            // Property 2: Alert type must be 'breach'
            expect(alert!.alert_type).toBe('breach');

            // Property 3: Severity must be 'critical' for breach status
            expect(alert!.severity).toBe('critical');

            // Property 4: Alert must include all required details
            expect(alert!.covenant_id).toBe(covenantId);
            expect(alert!.contract_id).toBe(contractId);
            expect(alert!.trigger_metric_value).toBe(currentValue);
            expect(alert!.threshold_value).toBe(thresholdValue);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should not generate alert when status remains compliant', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            covenantName: fc.string({ minLength: 5, maxLength: 100 }),
            metricName: fc.constantFrom('debt_to_ebitda', 'current_ratio'),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
          }),
          async ({ covenantId, contractId, covenantName, metricName, currentValue, thresholdValue }) => {
            const statusChangeEvent: StatusChangeEvent = {
              covenant_id: covenantId,
              contract_id: contractId,
              previous_status: 'compliant',
              new_status: 'compliant', // No change
              current_value: currentValue,
              threshold_value: thresholdValue,
              covenant_name: covenantName,
              metric_name: metricName,
            };

            const alert = await alertService.generateAlertFromStatusChange(statusChangeEvent);

            // Property: No alert should be generated when status doesn't change to warning/breached
            expect(alert).toBeNull();
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should not generate alert when status improves', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            covenantName: fc.string({ minLength: 5, maxLength: 100 }),
            metricName: fc.constantFrom('debt_to_ebitda', 'current_ratio'),
            previousStatus: fc.constantFrom('warning', 'breached'),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
          }),
          async ({ covenantId, contractId, covenantName, metricName, previousStatus, currentValue, thresholdValue }) => {
            const statusChangeEvent: StatusChangeEvent = {
              covenant_id: covenantId,
              contract_id: contractId,
              previous_status: previousStatus as 'warning' | 'breached',
              new_status: 'compliant', // Improvement
              current_value: currentValue,
              threshold_value: thresholdValue,
              covenant_name: covenantName,
              metric_name: metricName,
            };

            const alert = await alertService.generateAlertFromStatusChange(statusChangeEvent);

            // Property: No alert should be generated when status improves to compliant
            expect(alert).toBeNull();
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should determine correct severity based on buffer percentage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            currentValue: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
          }),
          async ({ currentValue, thresholdValue }) => {
            const severity = alertService.determineSeverity('warning', currentValue, thresholdValue);

            // Property 1: Severity must be one of the valid values
            expect(['low', 'medium', 'high', 'critical']).toContain(severity);

            // Property 2: For warning status, severity should not be critical
            expect(severity).not.toBe('critical');

            // Property 3: Calculate buffer and verify severity logic
            const bufferPercentage = Math.abs((currentValue - thresholdValue) / thresholdValue) * 100;
            
            if (bufferPercentage <= 5) {
              expect(severity).toBe('high');
            } else if (bufferPercentage <= 15) {
              expect(severity).toBe('medium');
            } else {
              expect(severity).toBe('low');
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    test('should always return critical severity for breached status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(1000) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(1000) }),
          }),
          async ({ currentValue, thresholdValue }) => {
            const severity = alertService.determineSeverity('breached', currentValue, thresholdValue);

            // Property: Breached status always results in critical severity
            expect(severity).toBe('critical');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should include all required alert details from status change event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            covenantName: fc.string({ minLength: 5, maxLength: 100 }),
            metricName: fc.constantFrom(
              'debt_to_ebitda', 'debt_to_equity', 'current_ratio',
              'interest_coverage', 'roe', 'roa'
            ),
            currentValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
          }),
          async ({ covenantId, contractId, bankId, covenantName, metricName, currentValue, thresholdValue }) => {
            const statusChangeEvent: StatusChangeEvent = {
              covenant_id: covenantId,
              contract_id: contractId,
              previous_status: 'compliant',
              new_status: 'warning',
              current_value: currentValue,
              threshold_value: thresholdValue,
              covenant_name: covenantName,
              metric_name: metricName,
            };

            // Mock alert creation - capture the input
            let capturedInput: AlertCreateInput | null = null;
            mockApiService.post.mockImplementation((_url: string, data: any) => {
              capturedInput = data as AlertCreateInput;
              return Promise.resolve({
                success: true,
                data: {
                  id: fc.sample(fc.uuid(), 1)[0],
                  ...data,
                  bank_id: bankId,
                  status: 'new',
                  triggered_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              });
            });

            await alertService.generateAlertFromStatusChange(statusChangeEvent);

            // Property: All required fields must be included in alert creation
            expect(capturedInput).not.toBeNull();
            expect(capturedInput!.covenant_id).toBe(covenantId);
            expect(capturedInput!.contract_id).toBe(contractId);
            expect(capturedInput!.trigger_metric_value).toBe(currentValue);
            expect(capturedInput!.threshold_value).toBe(thresholdValue);
            expect(capturedInput!.title).toContain(covenantName);
            expect(capturedInput!.description).toContain(metricName);
          }
        ),
        { numRuns: 15 }
      );
    });
  });


  /**
   * Property 6: Alert Acknowledgment Workflow
   * For any alert acknowledgment by a Bank_User, the system should update the alert status 
   * to acknowledged, record the acknowledgment timestamp and user, and maintain the 
   * acknowledgment in audit logs.
   * Validates: Requirements 4.4
   */
  describe('Property 6: Alert Acknowledgment Workflow', () => {
    test('should update alert status to acknowledged with user and timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            alertId: fc.uuid(),
            userId: fc.uuid(),
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            resolutionNotes: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
          }),
          async ({ alertId, userId, covenantId, contractId, bankId, resolutionNotes }) => {
            const acknowledgedAt = new Date().toISOString();

            // Mock the acknowledgment response
            const mockAcknowledgedAlert: Alert = {
              id: alertId,
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              alert_type: 'warning',
              severity: 'medium',
              title: 'Test Alert',
              description: 'Test description',
              status: 'acknowledged',
              acknowledged_at: acknowledgedAt,
              acknowledged_by: userId,
              resolution_notes: resolutionNotes || undefined,
              triggered_at: new Date(Date.now() - 3600000).toISOString(),
              created_at: new Date(Date.now() - 3600000).toISOString(),
              updated_at: acknowledgedAt,
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockAcknowledgedAlert,
            });

            const result = await alertService.acknowledgeAlert(
              alertId,
              userId,
              resolutionNotes ? { resolution_notes: resolutionNotes } : undefined
            );

            // Property 1: Status must be updated to 'acknowledged'
            expect(result.status).toBe('acknowledged');

            // Property 2: Acknowledged timestamp must be recorded
            expect(result.acknowledged_at).toBeDefined();
            const ackTime = new Date(result.acknowledged_at!);
            expect(ackTime.getTime()).toBeLessThanOrEqual(Date.now());

            // Property 3: Acknowledging user must be recorded
            expect(result.acknowledged_by).toBe(userId);

            // Property 4: Alert ID must match
            expect(result.id).toBe(alertId);

            // Property 5: Resolution notes should be preserved if provided
            if (resolutionNotes) {
              expect(result.resolution_notes).toBe(resolutionNotes);
            }

            // Property 6: Updated timestamp should be recent
            const updatedTime = new Date(result.updated_at);
            const timeDiff = Date.now() - updatedTime.getTime();
            expect(timeDiff).toBeLessThan(60000); // Within 1 minute
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should preserve original alert details after acknowledgment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            alertId: fc.uuid(),
            userId: fc.uuid(),
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            alertType: fc.constantFrom('warning', 'critical', 'breach', 'reporting_due'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            title: fc.string({ minLength: 10, maxLength: 100 }),
            description: fc.string({ minLength: 20, maxLength: 500 }),
            triggerValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            thresholdValue: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
          }),
          async ({ alertId, userId, covenantId, contractId, bankId, alertType, severity, title, description, triggerValue, thresholdValue }) => {
            const triggeredAt = new Date(Date.now() - 7200000).toISOString();
            const acknowledgedAt = new Date().toISOString();

            // Mock the acknowledgment response preserving original details
            const mockAcknowledgedAlert: Alert = {
              id: alertId,
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              alert_type: alertType as 'warning' | 'critical' | 'breach' | 'reporting_due',
              severity: severity as 'low' | 'medium' | 'high' | 'critical',
              title: title,
              description: description,
              trigger_metric_value: triggerValue,
              threshold_value: thresholdValue,
              status: 'acknowledged',
              acknowledged_at: acknowledgedAt,
              acknowledged_by: userId,
              triggered_at: triggeredAt,
              created_at: triggeredAt,
              updated_at: acknowledgedAt,
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockAcknowledgedAlert,
            });

            const result = await alertService.acknowledgeAlert(alertId, userId);

            // Property 1: Original alert type must be preserved
            expect(result.alert_type).toBe(alertType);

            // Property 2: Original severity must be preserved
            expect(result.severity).toBe(severity);

            // Property 3: Original title must be preserved
            expect(result.title).toBe(title);

            // Property 4: Original description must be preserved
            expect(result.description).toBe(description);

            // Property 5: Original trigger value must be preserved
            expect(result.trigger_metric_value).toBe(triggerValue);

            // Property 6: Original threshold value must be preserved
            expect(result.threshold_value).toBe(thresholdValue);

            // Property 7: Original triggered_at must be preserved
            expect(result.triggered_at).toBe(triggeredAt);

            // Property 8: Covenant and contract IDs must be preserved
            expect(result.covenant_id).toBe(covenantId);
            expect(result.contract_id).toBe(contractId);
            expect(result.bank_id).toBe(bankId);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should handle acknowledgment with various resolution notes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            alertId: fc.uuid(),
            userId: fc.uuid(),
            resolutionNotes: fc.oneof(
              fc.constant(undefined),
              fc.constant(''),
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.string({ minLength: 100, maxLength: 500 }),
              fc.string({ minLength: 500, maxLength: 1000 }),
            ),
          }),
          async ({ alertId, userId, resolutionNotes }) => {
            const mockAlert: Alert = {
              id: alertId,
              covenant_id: fc.sample(fc.uuid(), 1)[0],
              contract_id: fc.sample(fc.uuid(), 1)[0],
              bank_id: fc.sample(fc.uuid(), 1)[0],
              alert_type: 'warning',
              severity: 'medium',
              title: 'Test Alert',
              description: 'Test description',
              status: 'acknowledged',
              acknowledged_at: new Date().toISOString(),
              acknowledged_by: userId,
              resolution_notes: resolutionNotes || undefined,
              triggered_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: mockAlert,
            });

            const result = await alertService.acknowledgeAlert(
              alertId,
              userId,
              resolutionNotes ? { resolution_notes: resolutionNotes } : undefined
            );

            // Property 1: Status must always be acknowledged
            expect(result.status).toBe('acknowledged');

            // Property 2: User must always be recorded
            expect(result.acknowledged_by).toBe(userId);

            // Property 3: Resolution notes should match input (if provided and non-empty)
            if (resolutionNotes && resolutionNotes.length > 0) {
              expect(result.resolution_notes).toBe(resolutionNotes);
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should escalate unacknowledged alerts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            alertId: fc.uuid(),
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            currentSeverity: fc.constantFrom('low', 'medium', 'high'),
            escalationReason: fc.string({ minLength: 10, maxLength: 200 }),
          }),
          async ({ alertId, covenantId, contractId, bankId, currentSeverity, escalationReason }) => {
            // Mock get alert response
            const mockAlert: Alert = {
              id: alertId,
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              alert_type: 'warning',
              severity: currentSeverity as 'low' | 'medium' | 'high',
              title: 'Test Alert',
              description: 'Test description',
              status: 'new',
              triggered_at: new Date(Date.now() - 7200000).toISOString(),
              created_at: new Date(Date.now() - 7200000).toISOString(),
              updated_at: new Date(Date.now() - 7200000).toISOString(),
            };

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockAlert,
            });

            // Determine expected new severity
            const severityLevels = ['low', 'medium', 'high', 'critical'];
            const currentIndex = severityLevels.indexOf(currentSeverity);
            const expectedNewSeverity = severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)];

            mockApiService.put.mockResolvedValue({
              success: true,
              data: {
                ...mockAlert,
                severity: expectedNewSeverity,
                status: 'escalated',
                updated_at: new Date().toISOString(),
              },
            });

            const result = await alertService.escalateAlert(alertId, escalationReason);

            // Property 1: Previous severity must be recorded
            expect(result.previous_severity).toBe(currentSeverity);

            // Property 2: New severity must be one level higher (or critical if already high)
            expect(result.new_severity).toBe(expectedNewSeverity);

            // Property 3: Escalation timestamp must be recorded
            expect(result.escalated_at).toBeDefined();
            const escalatedTime = new Date(result.escalated_at);
            expect(escalatedTime.getTime()).toBeLessThanOrEqual(Date.now());

            // Property 4: Escalation reason must be recorded
            expect(result.reason).toBe(escalationReason);

            // Property 5: Alert ID must match
            expect(result.alert_id).toBe(alertId);
          }
        ),
        { numRuns: 15 }
      );
    });

    test('should not escalate beyond critical severity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            alertId: fc.uuid(),
            covenantId: fc.uuid(),
            contractId: fc.uuid(),
            bankId: fc.uuid(),
            escalationReason: fc.string({ minLength: 10, maxLength: 200 }),
          }),
          async ({ alertId, covenantId, contractId, bankId, escalationReason }) => {
            // Mock get alert response with critical severity
            const mockAlert: Alert = {
              id: alertId,
              covenant_id: covenantId,
              contract_id: contractId,
              bank_id: bankId,
              alert_type: 'breach',
              severity: 'critical',
              title: 'Test Alert',
              description: 'Test description',
              status: 'new',
              triggered_at: new Date(Date.now() - 7200000).toISOString(),
              created_at: new Date(Date.now() - 7200000).toISOString(),
              updated_at: new Date(Date.now() - 7200000).toISOString(),
            };

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockAlert,
            });

            mockApiService.put.mockResolvedValue({
              success: true,
              data: {
                ...mockAlert,
                status: 'escalated',
                updated_at: new Date().toISOString(),
              },
            });

            const result = await alertService.escalateAlert(alertId, escalationReason);

            // Property: Critical severity should remain critical after escalation
            expect(result.previous_severity).toBe('critical');
            expect(result.new_severity).toBe('critical');
          }
        ),
        { numRuns: 10 }
      );
    });

    test('should identify alerts needing escalation based on time threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            thresholdMinutes: fc.integer({ min: 30, max: 240 }),
            alertCount: fc.integer({ min: 1, max: 10 }),
          }),
          async ({ thresholdMinutes, alertCount }) => {
            const now = Date.now();
            
            // Generate mix of old and new alerts
            const mockAlerts: Alert[] = Array.from({ length: alertCount }, (_, i) => {
              const isOld = i % 2 === 0;
              const triggeredAt = isOld 
                ? new Date(now - (thresholdMinutes + 30) * 60 * 1000).toISOString()
                : new Date(now - (thresholdMinutes - 15) * 60 * 1000).toISOString();
              
              return {
                id: fc.sample(fc.uuid(), 1)[0],
                covenant_id: fc.sample(fc.uuid(), 1)[0],
                contract_id: fc.sample(fc.uuid(), 1)[0],
                bank_id: fc.sample(fc.uuid(), 1)[0],
                alert_type: 'warning' as const,
                severity: 'medium' as const,
                title: `Test Alert ${i}`,
                description: 'Test description',
                status: 'new' as const,
                triggered_at: triggeredAt,
                created_at: triggeredAt,
                updated_at: triggeredAt,
              };
            });

            mockApiService.get.mockResolvedValue({
              success: true,
              data: mockAlerts,
            });

            const alertsForEscalation = await alertService.getAlertsForEscalation(thresholdMinutes);

            // Property 1: All returned alerts should be past the threshold
            alertsForEscalation.forEach(alert => {
              const triggeredAt = new Date(alert.triggered_at);
              const minutesSinceTriggered = (now - triggeredAt.getTime()) / (1000 * 60);
              expect(minutesSinceTriggered).toBeGreaterThanOrEqual(thresholdMinutes);
            });

            // Property 2: All returned alerts should have 'new' status
            alertsForEscalation.forEach(alert => {
              expect(alert.status).toBe('new');
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
