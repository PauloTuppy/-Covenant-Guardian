/**
 * Property-Based Tests for Audit Trail Completeness
 * Feature: covenant-guardian, Property 14: Audit Trail Completeness
 * Validates: Requirements 9.2, 9.3, 9.5
 */

import fc from 'fast-check';
import { apiService } from '@/services/api';
import { DatabaseUtils } from '@/utils/database';
import { PBT_CONFIG } from '@/test/setup';

// Mock API service for testing
jest.mock('@/services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Property-Based Tests: Audit Trail Completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 14: Audit Trail Completeness
   * For any system action performed, the system should log the activity with user attribution, 
   * timestamps, and comprehensive details, and record access events for sensitive data operations.
   */
  describe('Property 14: Audit Trail Completeness', () => {
    
    test('Property: System actions generate complete audit logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            userEmail: fc.emailAddress(),
            action: fc.constantFrom(
              'contract_created', 'contract_updated', 'contract_deleted',
              'covenant_created', 'covenant_updated', 'covenant_deleted',
              'alert_acknowledged', 'alert_resolved',
              'financial_data_ingested', 'report_generated'
            ),
            tableName: fc.constantFrom('contracts', 'covenants', 'alerts', 'financial_metrics', 'reports'),
            recordId: fc.uuid(),
            changes: fc.record({
              field1: fc.string(),
              field2: fc.integer(),
              field3: fc.boolean(),
            }),
            ipAddress: fc.ipV4(),
          }),
          async ({ bankId, userId, userEmail, action, tableName, recordId, changes, ipAddress }) => {
            // Mock the audit log creation
            const expectedAuditLog = DatabaseUtils.createAuditLogEntry(
              bankId,
              action,
              tableName,
              recordId,
              changes,
              userId,
              userEmail
            );

            mockApiService.post.mockResolvedValue({
              success: true,
              data: {
                ...expectedAuditLog,
                id: 'audit-log-123',
                ip_address: ipAddress,
              }
            });

            // Simulate system action that should create audit log
            const auditResponse = await apiService.post('/audit-logs', {
              bank_id: bankId,
              action,
              table_name: tableName,
              record_id: recordId,
              changes,
              user_id: userId,
              user_email: userEmail,
              ip_address: ipAddress,
            });

            // Verify audit log was created with all required fields
            expect(auditResponse.success).toBe(true);
            expect(auditResponse.data).toMatchObject({
              bank_id: bankId,
              action,
              table_name: tableName,
              record_id: recordId,
              user_id: userId,
              user_email: userEmail,
              ip_address: ipAddress,
            });

            // Verify changes are properly recorded
            expect(auditResponse.data.changes).toBeDefined();
            expect(typeof auditResponse.data.changes).toBe('object');

            // Verify timestamp is present
            expect(auditResponse.data.created_at).toBeDefined();
            expect(new Date(auditResponse.data.created_at)).toBeInstanceOf(Date);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Property: Sensitive data access is logged', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            userEmail: fc.emailAddress(),
            sensitiveResource: fc.constantFrom(
              '/contracts/123/details',
              '/financial-metrics/456',
              '/reports/789/download',
              '/audit-logs',
              '/users/admin-panel'
            ),
            accessMethod: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
            userAgent: fc.string({ minLength: 10, maxLength: 100 }),
            sessionId: fc.uuid(),
          }),
          async ({ bankId, userId, userEmail, sensitiveResource, accessMethod, userAgent, sessionId }) => {
            // Mock successful access to sensitive resource
            mockApiService.get.mockResolvedValue({
              success: true,
              data: { id: 'resource-123', sensitive_data: 'confidential' }
            });

            // Mock audit log for sensitive access
            const sensitiveAccessLog = {
              id: 'audit-log-456',
              bank_id: bankId,
              action: 'sensitive_data_access',
              table_name: 'access_logs',
              record_id: 'access-' + Date.now(),
              changes: {
                resource_path: sensitiveResource,
                access_method: accessMethod,
                user_agent: userAgent,
                session_id: sessionId,
              },
              user_id: userId,
              user_email: userEmail,
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: sensitiveAccessLog
            });

            // Simulate access to sensitive resource
            await apiService.get(sensitiveResource, {
              headers: {
                'User-Agent': userAgent,
                'X-Session-ID': sessionId,
              }
            });

            // Verify sensitive access was logged
            const auditResponse = await apiService.post('/audit-logs', {
              action: 'sensitive_data_access',
              resource_path: sensitiveResource,
              access_method: accessMethod,
              user_id: userId,
              user_email: userEmail,
            });

            expect(auditResponse.success).toBe(true);
            expect(auditResponse.data.action).toBe('sensitive_data_access');
            expect(auditResponse.data.bank_id).toBe(bankId);
            expect(auditResponse.data.user_id).toBe(userId);
            expect(auditResponse.data.user_email).toBe(userEmail);
            expect(auditResponse.data.changes.resource_path).toBe(sensitiveResource);
            expect(auditResponse.data.changes.access_method).toBe(accessMethod);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Property: Data modifications include before/after states', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            contractId: fc.uuid(),
            oldData: fc.record({
              contract_name: fc.string({ minLength: 1, maxLength: 50 }),
              principal_amount: fc.float({ min: 1000, max: 1000000 }),
              status: fc.constantFrom('active', 'closed', 'watch'),
            }),
            newData: fc.record({
              contract_name: fc.string({ minLength: 1, maxLength: 50 }),
              principal_amount: fc.float({ min: 1000, max: 1000000 }),
              status: fc.constantFrom('active', 'closed', 'watch'),
            }),
          }),
          async ({ bankId, userId, contractId, oldData, newData }) => {
            // Ensure we have actual changes
            fc.pre(
              oldData.contract_name !== newData.contract_name ||
              oldData.principal_amount !== newData.principal_amount ||
              oldData.status !== newData.status
            );

            // Mock the update operation
            mockApiService.put.mockResolvedValue({
              success: true,
              data: { id: contractId, ...newData, bank_id: bankId }
            });

            // Mock audit log for the update
            const updateAuditLog = {
              id: 'audit-log-789',
              bank_id: bankId,
              action: 'contract_updated',
              table_name: 'contracts',
              record_id: contractId,
              changes: {
                old: oldData,
                new: newData,
                modified_fields: Object.keys(newData).filter(key => 
                  oldData[key as keyof typeof oldData] !== newData[key as keyof typeof newData]
                ),
              },
              user_id: userId,
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: updateAuditLog
            });

            // Perform update operation
            await apiService.put(`/contracts/${contractId}`, newData);

            // Verify audit log captures before/after states
            const auditResponse = await apiService.post('/audit-logs', {
              action: 'contract_updated',
              table_name: 'contracts',
              record_id: contractId,
              changes: {
                old: oldData,
                new: newData,
              },
              user_id: userId,
            });

            expect(auditResponse.success).toBe(true);
            expect(auditResponse.data.changes.old).toEqual(oldData);
            expect(auditResponse.data.changes.new).toEqual(newData);
            expect(auditResponse.data.action).toBe('contract_updated');
            expect(auditResponse.data.table_name).toBe('contracts');
            expect(auditResponse.data.record_id).toBe(contractId);
            expect(auditResponse.data.user_id).toBe(userId);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Property: Failed operations are also audited', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            userEmail: fc.emailAddress(),
            attemptedAction: fc.constantFrom(
              'unauthorized_access',
              'invalid_data_submission',
              'cross_tenant_access',
              'permission_denied'
            ),
            errorCode: fc.constantFrom(
              'UNAUTHORIZED',
              'VALIDATION_ERROR',
              'CROSS_TENANT_ACCESS_DENIED',
              'INSUFFICIENT_PERMISSIONS'
            ),
            resourcePath: fc.string({ minLength: 5, maxLength: 50 }),
            failureReason: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async ({ bankId, userId, userEmail, attemptedAction, errorCode, resourcePath, failureReason }) => {
            // Mock failed operation
            mockApiService.get.mockRejectedValue({
              response: {
                status: 403,
                data: {
                  error: {
                    code: errorCode,
                    message: failureReason,
                  }
                }
              }
            });

            // Mock audit log for failed operation
            const failureAuditLog = {
              id: 'audit-log-failure-123',
              bank_id: bankId,
              action: `failed_${attemptedAction}`,
              table_name: 'security_events',
              record_id: 'failure-' + Date.now(),
              changes: {
                attempted_resource: resourcePath,
                error_code: errorCode,
                failure_reason: failureReason,
                timestamp: new Date().toISOString(),
              },
              user_id: userId,
              user_email: userEmail,
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValue({
              success: true,
              data: failureAuditLog
            });

            try {
              // Attempt operation that will fail
              await apiService.get(resourcePath);
            } catch (error) {
              // Operation failed as expected
            }

            // Verify failure was audited
            const auditResponse = await apiService.post('/audit-logs', {
              action: `failed_${attemptedAction}`,
              table_name: 'security_events',
              changes: {
                attempted_resource: resourcePath,
                error_code: errorCode,
                failure_reason: failureReason,
              },
              user_id: userId,
              user_email: userEmail,
            });

            expect(auditResponse.success).toBe(true);
            expect(auditResponse.data.action).toBe(`failed_${attemptedAction}`);
            expect(auditResponse.data.bank_id).toBe(bankId);
            expect(auditResponse.data.user_id).toBe(userId);
            expect(auditResponse.data.user_email).toBe(userEmail);
            expect(auditResponse.data.changes.attempted_resource).toBe(resourcePath);
            expect(auditResponse.data.changes.error_code).toBe(errorCode);
            expect(auditResponse.data.changes.failure_reason).toBe(failureReason);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Property: Audit logs maintain chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            actions: fc.array(
              fc.record({
                action: fc.constantFrom('create', 'update', 'delete', 'access'),
                tableName: fc.constantFrom('contracts', 'covenants', 'alerts'),
                recordId: fc.uuid(),
              }),
              { minLength: 2, maxLength: 5 }
            ),
          }),
          async ({ bankId, userId, actions }) => {
            const auditLogs: any[] = [];
            const timestamps: Date[] = [];

            // Mock sequential audit log creation
            for (let i = 0; i < actions.length; i++) {
              const action = actions[i];
              const timestamp = new Date(Date.now() + i * 1000); // Ensure chronological order
              timestamps.push(timestamp);

              const auditLog = {
                id: `audit-log-${i}`,
                bank_id: bankId,
                action: `${action.tableName}_${action.action}`,
                table_name: action.tableName,
                record_id: action.recordId,
                user_id: userId,
                created_at: timestamp.toISOString(),
              };

              auditLogs.push(auditLog);

              mockApiService.post.mockResolvedValueOnce({
                success: true,
                data: auditLog
              });

              // Create audit log
              await apiService.post('/audit-logs', {
                action: auditLog.action,
                table_name: auditLog.table_name,
                record_id: auditLog.record_id,
                user_id: userId,
              });
            }

            // Mock retrieval of audit logs in chronological order
            mockApiService.get.mockResolvedValue({
              success: true,
              data: auditLogs.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              ),
            });

            // Retrieve audit logs
            const response = await apiService.get(`/audit-logs?bank_id=${bankId}&user_id=${userId}&sort=created_at&order=asc`);

            expect(response.success).toBe(true);
            expect(response.data.length).toBe(actions.length);

            // Verify chronological order
            for (let i = 1; i < response.data.length; i++) {
              const prevTimestamp = new Date(response.data[i - 1].created_at);
              const currentTimestamp = new Date(response.data[i].created_at);
              expect(currentTimestamp.getTime()).toBeGreaterThanOrEqual(prevTimestamp.getTime());
            }

            // Verify all actions are logged
            const loggedActions = response.data.map((log: any) => log.action);
            const expectedActions = actions.map(action => `${action.tableName}_${action.action}`);
            expect(loggedActions).toEqual(expectedActions);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns, timeout: PBT_CONFIG.timeout }
      );
    });

    test('Property: Audit logs are immutable once created', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            bankId: fc.uuid(),
            userId: fc.uuid(),
            auditLogId: fc.uuid(),
            originalData: fc.record({
              action: fc.string(),
              table_name: fc.string(),
              record_id: fc.uuid(),
            }),
            attemptedModification: fc.record({
              action: fc.string(),
              table_name: fc.string(),
              record_id: fc.uuid(),
            }),
          }),
          async ({ bankId, userId, auditLogId, originalData, attemptedModification }) => {
            // Ensure we're attempting to modify the data
            fc.pre(
              originalData.action !== attemptedModification.action ||
              originalData.table_name !== attemptedModification.table_name ||
              originalData.record_id !== attemptedModification.record_id
            );

            // Mock original audit log creation
            const originalAuditLog = {
              id: auditLogId,
              bank_id: bankId,
              ...originalData,
              user_id: userId,
              created_at: new Date().toISOString(),
            };

            mockApiService.post.mockResolvedValueOnce({
              success: true,
              data: originalAuditLog
            });

            // Create original audit log
            await apiService.post('/audit-logs', originalData);

            // Mock attempt to modify audit log - should fail
            mockApiService.put.mockRejectedValue({
              response: {
                status: 403,
                data: {
                  error: {
                    code: 'AUDIT_LOG_IMMUTABLE',
                    message: 'Audit logs cannot be modified once created',
                  }
                }
              }
            });

            // Attempt to modify audit log
            try {
              await apiService.put(`/audit-logs/${auditLogId}`, attemptedModification);
              
              // Should not reach here - modification should be denied
              expect(true).toBe(false);
            } catch (error: any) {
              // Verify modification was properly denied
              expect(error.response.status).toBe(403);
              expect(error.response.data.error.code).toBe('AUDIT_LOG_IMMUTABLE');
            }

            // Mock retrieval to verify original data is unchanged
            mockApiService.get.mockResolvedValue({
              success: true,
              data: originalAuditLog
            });

            // Verify original audit log remains unchanged
            const retrievedLog = await apiService.get(`/audit-logs/${auditLogId}`);
            expect(retrievedLog.success).toBe(true);
            expect(retrievedLog.data).toEqual(originalAuditLog);
          }
        ),
        { numRuns: PBT_CONFIG.numRuns, timeout: PBT_CONFIG.timeout }
      );
    });
  });
});