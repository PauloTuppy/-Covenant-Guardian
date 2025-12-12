/**
 * Jest test setup file
 * Configures testing environment and global mocks
 */

import '@testing-library/jest-dom';

// Mock environment variables
process.env.VITE_API_BASE_URL = 'https://test-api.example.com';
process.env.VITE_ENV = 'test';
process.env.VITE_ENABLE_PBT = 'true';
process.env.VITE_ENABLE_AUDIT_LOGS = 'true';
process.env.VITE_ENABLE_MULTI_TENANT = 'true';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock window.location - handle jsdom's non-configurable location property
try {
  // Try to delete and reassign (works in some jsdom versions)
  const locationMock = {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  };
  
  // Use a proxy to intercept location access
  if (typeof window !== 'undefined') {
    // Mock the methods we need
    window.location.assign = jest.fn();
    window.location.replace = jest.fn();
    window.location.reload = jest.fn();
  }
} catch (e) {
  // Silently ignore if location cannot be mocked
}

// Mock console methods in test environment
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Property-based testing configuration
export const PBT_CONFIG = {
  numRuns: 100, // Run each property test 100 times as specified in design
  timeout: 5000, // 5 second timeout for property tests
  verbose: process.env.NODE_ENV === 'test',
};