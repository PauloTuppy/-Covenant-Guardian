/**
 * Basic test to verify Jest setup
 */

import { API_CONFIG, API_ENDPOINTS } from './api';

describe('API Configuration', () => {
  test('should have correct base configuration', () => {
    expect(API_CONFIG.baseURL).toBeDefined();
    expect(API_CONFIG.timeout).toBe(30000);
    expect(API_CONFIG.retryAttempts).toBe(3);
  });

  test('should have all required endpoints', () => {
    expect(API_ENDPOINTS.auth).toBeDefined();
    expect(API_ENDPOINTS.contracts).toBeDefined();
    expect(API_ENDPOINTS.covenants).toBeDefined();
    expect(API_ENDPOINTS.alerts).toBeDefined();
  });
});