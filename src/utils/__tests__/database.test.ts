/**
 * Unit Tests for Database Utilities
 * Tests the database helper functions and calculations
 */

import { DatabaseUtils } from '../database';
import { FinancialMetrics, Covenant } from '@/types';

describe('Database Utilities', () => {
  
  describe('Query Builders', () => {
    test('buildTenantFilter should create proper WHERE clause', () => {
      const bankId = 'bank-123';
      const filter = DatabaseUtils.buildTenantFilter(bankId);
      expect(filter).toBe("bank_id = 'bank-123'");
    });

    test('buildPaginationClause should create proper LIMIT/OFFSET', () => {
      expect(DatabaseUtils.buildPaginationClause(1, 20)).toBe('LIMIT 20 OFFSET 0');
      expect(DatabaseUtils.buildPaginationClause(3, 10)).toBe('LIMIT 10 OFFSET 20');
      expect(DatabaseUtils.buildPaginationClause()).toBe('LIMIT 20 OFFSET 0');
    });

    test('buildOrderByClause should create proper ORDER BY', () => {
      expect(DatabaseUtils.buildOrderByClause('created_at')).toBe('ORDER BY created_at DESC');
      expect(DatabaseUtils.buildOrderByClause('name', 'asc')).toBe('ORDER BY name ASC');
    });

    test('buildOrderByClause should validate field names', () => {
      expect(() => DatabaseUtils.buildOrderByClause('invalid-field-name')).toThrow('Invalid field name format');
      expect(() => DatabaseUtils.buildOrderByClause('1; DROP TABLE users;')).toThrow('Invalid field name format');
    });

    test('buildOrderByClause should validate allowed fields', () => {
      const allowedFields = ['name', 'created_at', 'status'];
      expect(() => DatabaseUtils.buildOrderByClause('invalid_field', 'asc', allowedFields)).toThrow('Invalid sort field');
      expect(() => DatabaseUtils.buildOrderByClause('name', 'asc', allowedFields)).not.toThrow();
    });
  });

  describe('Covenant Health Calculations', () => {
    test('calculateBufferPercentage should calculate correctly for <= operator', () => {
      // Compliant case (3.0 <= 3.5)
      expect(DatabaseUtils.calculateBufferPercentage(3.0, 3.5, '<=')).toBe(0);
      
      // Breached case (4.0 > 3.5)
      expect(DatabaseUtils.calculateBufferPercentage(4.0, 3.5, '<=')).toBeCloseTo(14.29, 2);
    });

    test('calculateBufferPercentage should calculate correctly for >= operator', () => {
      // Compliant case (2.0 >= 1.5)
      expect(DatabaseUtils.calculateBufferPercentage(2.0, 1.5, '>=')).toBe(0);
      
      // Breached case (1.0 < 1.5)
      expect(DatabaseUtils.calculateBufferPercentage(1.0, 1.5, '>=')).toBeCloseTo(33.33, 2);
    });

    test('determineCovenantStatus should return correct status', () => {
      // Compliant
      expect(DatabaseUtils.determineCovenantStatus(3.0, 3.5, '<=')).toBe('compliant');
      
      // Warning (close to breach)
      expect(DatabaseUtils.determineCovenantStatus(3.45, 3.5, '<=')).toBe('warning');
      
      // Breached
      expect(DatabaseUtils.determineCovenantStatus(4.0, 3.5, '<=')).toBe('breached');
    });

    test('evaluateCovenantCondition should evaluate conditions correctly', () => {
      // Test <= operator
      expect(DatabaseUtils.evaluateCovenantCondition(3.0, 3.5, '<=')).toBe(true);
      expect(DatabaseUtils.evaluateCovenantCondition(4.0, 3.5, '<=')).toBe(false);
      expect(DatabaseUtils.evaluateCovenantCondition(4.0, 3.5, '<=', true)).toBe(true); // Check for breach
      
      // Test >= operator
      expect(DatabaseUtils.evaluateCovenantCondition(2.0, 1.5, '>=')).toBe(true);
      expect(DatabaseUtils.evaluateCovenantCondition(1.0, 1.5, '>=')).toBe(false);
      expect(DatabaseUtils.evaluateCovenantCondition(1.0, 1.5, '>=', true)).toBe(true); // Check for breach
    });
  });

  describe('Trend Analysis', () => {
    test('calculateTrend should identify improving trend', () => {
      const improvingData = [1.0, 1.2, 1.5, 1.8, 2.0];
      expect(DatabaseUtils.calculateTrend(improvingData)).toBe('improving');
    });

    test('calculateTrend should identify deteriorating trend', () => {
      const deterioratingData = [2.0, 1.8, 1.5, 1.2, 1.0];
      expect(DatabaseUtils.calculateTrend(deterioratingData)).toBe('deteriorating');
    });

    test('calculateTrend should identify stable trend', () => {
      const stableData = [1.5, 1.51, 1.49, 1.50, 1.52];
      expect(DatabaseUtils.calculateTrend(stableData)).toBe('stable');
    });

    test('calculateTrend should handle insufficient data', () => {
      expect(DatabaseUtils.calculateTrend([1.0])).toBe('stable');
      expect(DatabaseUtils.calculateTrend([])).toBe('stable');
    });

    test('estimateDaysToBreach should calculate correctly', () => {
      // Deteriorating trend for <= covenant
      const days = DatabaseUtils.estimateDaysToBreach(3.0, 3.5, '<=', 0.1, 4);
      expect(days).toBeCloseTo(456, 0); // (3.5 - 3.0) / 0.1 * (365/4)
    });

    test('estimateDaysToBreach should return null for stable/improving trends', () => {
      expect(DatabaseUtils.estimateDaysToBreach(3.0, 3.5, '<=', 0, 4)).toBeNull();
      expect(DatabaseUtils.estimateDaysToBreach(3.0, 3.5, '<=', -0.1, 4)).toBeNull();
    });
  });

  describe('Data Validation', () => {
    test('validateFinancialMetrics should validate required fields', () => {
      const invalidMetrics: Partial<FinancialMetrics> = {
        // Missing required fields
      };
      
      const errors = DatabaseUtils.validateFinancialMetrics(invalidMetrics);
      expect(errors).toContain('Borrower ID is required');
      expect(errors).toContain('Period date is required');
      expect(errors).toContain('Data source is required');
    });

    test('validateFinancialMetrics should validate positive values', () => {
      const invalidMetrics: Partial<FinancialMetrics> = {
        borrower_id: 'borrower-123',
        period_date: '2024-12-31',
        source: 'test',
        debt_total: -1000, // Invalid negative value
        revenue: -500, // Invalid negative value
      };
      
      const errors = DatabaseUtils.validateFinancialMetrics(invalidMetrics);
      expect(errors).toContain('debt_total cannot be negative');
      expect(errors).toContain('revenue cannot be negative');
    });

    test('validateFinancialMetrics should validate confidence score', () => {
      const invalidMetrics: Partial<FinancialMetrics> = {
        borrower_id: 'borrower-123',
        period_date: '2024-12-31',
        source: 'test',
        data_confidence: 1.5, // Invalid > 1
      };
      
      const errors = DatabaseUtils.validateFinancialMetrics(invalidMetrics);
      expect(errors).toContain('Data confidence must be between 0 and 1');
    });

    test('validateCovenant should validate required fields', () => {
      const invalidCovenant: Partial<Covenant> = {
        // Missing required fields
      };
      
      const errors = DatabaseUtils.validateCovenant(invalidCovenant);
      expect(errors).toContain('Contract ID is required');
      expect(errors).toContain('Covenant name is required');
      expect(errors).toContain('Operator is required');
    });

    test('validateCovenant should validate operator values', () => {
      const invalidCovenant: Partial<Covenant> = {
        contract_id: 'contract-123',
        covenant_name: 'Test Covenant',
        operator: 'invalid' as any,
      };
      
      const errors = DatabaseUtils.validateCovenant(invalidCovenant);
      expect(errors).toContain('Invalid operator');
    });

    test('validateCovenant should validate covenant type', () => {
      const invalidCovenant: Partial<Covenant> = {
        contract_id: 'contract-123',
        covenant_name: 'Test Covenant',
        operator: '<=',
        covenant_type: 'invalid' as any,
      };
      
      const errors = DatabaseUtils.validateCovenant(invalidCovenant);
      expect(errors).toContain('Invalid covenant type');
    });
  });

  describe('Query Generation', () => {
    test('buildCovenantHealthQuery should generate proper query', () => {
      const bankId = 'bank-123';
      const query = DatabaseUtils.buildCovenantHealthQuery(bankId);
      
      expect(query).toContain('WHERE ch.bank_id = \'bank-123\'');
      expect(query).toContain('ORDER BY ch.last_calculated DESC');
      expect(query).toContain('JOIN covenants c ON ch.covenant_id = c.id');
    });

    test('buildCovenantHealthQuery should handle filters', () => {
      const bankId = 'bank-123';
      const filters = {
        status: 'breached' as const,
        contractId: 'contract-456',
        limit: 10,
      };
      
      const query = DatabaseUtils.buildCovenantHealthQuery(bankId, filters);
      
      expect(query).toContain('WHERE ch.bank_id = \'bank-123\'');
      expect(query).toContain('AND ch.status = \'breached\'');
      expect(query).toContain('AND ch.contract_id = \'contract-456\'');
      expect(query).toContain('LIMIT 10');
    });

    test('buildPortfolioRiskQuery should generate proper query', () => {
      const bankId = 'bank-123';
      const query = DatabaseUtils.buildPortfolioRiskQuery(bankId);
      
      expect(query).toContain('WHERE c.bank_id = \'bank-123\'');
      expect(query).toContain('COUNT(DISTINCT c.id) as total_contracts');
      expect(query).toContain('SUM(c.principal_amount) as total_principal');
    });
  });

  describe('Materialized View Helpers', () => {
    test('shouldRefreshMaterializedView should determine refresh need', () => {
      const now = new Date();
      const recentRefresh = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
      const oldRefresh = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago
      
      expect(DatabaseUtils.shouldRefreshMaterializedView(recentRefresh, 15)).toBe(false);
      expect(DatabaseUtils.shouldRefreshMaterializedView(oldRefresh, 15)).toBe(true);
    });

    test('buildRefreshMaterializedViewQuery should generate proper SQL', () => {
      expect(DatabaseUtils.buildRefreshMaterializedViewQuery('test_view')).toBe(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY test_view'
      );
      
      expect(DatabaseUtils.buildRefreshMaterializedViewQuery('test_view', false)).toBe(
        'REFRESH MATERIALIZED VIEW  test_view'
      );
    });
  });

  describe('Audit Log Helpers', () => {
    test('createAuditLogEntry should create proper entry', () => {
      const entry = DatabaseUtils.createAuditLogEntry(
        'bank-123',
        'contract_created',
        'contracts',
        'contract-456',
        { name: 'Test Contract' },
        'user-789',
        'user@example.com'
      );
      
      expect(entry.bank_id).toBe('bank-123');
      expect(entry.action).toBe('contract_created');
      expect(entry.table_name).toBe('contracts');
      expect(entry.record_id).toBe('contract-456');
      expect(entry.user_id).toBe('user-789');
      expect(entry.user_email).toBe('user@example.com');
      expect(entry.changes).toEqual({ name: 'Test Contract' });
      expect(entry.created_at).toBeDefined();
    });

    test('createAuditLogEntry should handle non-object changes', () => {
      const entry = DatabaseUtils.createAuditLogEntry(
        'bank-123',
        'test_action',
        'test_table',
        'record-123',
        'simple string'
      );
      
      expect(entry.changes).toEqual({ data: 'simple string' });
    });
  });

  describe('Performance Optimization', () => {
    test('getRecommendedIndexes should return index creation statements', () => {
      const indexes = DatabaseUtils.getRecommendedIndexes();
      
      expect(indexes).toBeInstanceOf(Array);
      expect(indexes.length).toBeGreaterThan(0);
      
      indexes.forEach(index => {
        expect(index).toContain('CREATE INDEX CONCURRENTLY');
        expect(index).toContain('IF NOT EXISTS');
      });
    });

    test('recommended indexes should include multi-tenant patterns', () => {
      const indexes = DatabaseUtils.getRecommendedIndexes();
      
      const multiTenantIndexes = indexes.filter(index => 
        index.includes('bank_id') || index.includes('bank_status')
      );
      
      expect(multiTenantIndexes.length).toBeGreaterThan(0);
    });
  });
});