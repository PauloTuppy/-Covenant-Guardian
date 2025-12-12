/**
 * Security Utilities
 * Handles data encryption, security headers, and sensitive data protection
 * Requirements: 9.1, 10.1, 10.4
 */

// ===== ENCRYPTION UTILITIES =====

/**
 * Simple XOR-based obfuscation for client-side sensitive data
 * Note: For production, use Web Crypto API with proper key management
 */
const OBFUSCATION_KEY = 'covenant-guardian-2025';

/**
 * Obfuscate sensitive string data for client-side storage
 */
export function obfuscateData(data: string): string {
  if (!data) return '';
  
  let result = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

/**
 * Deobfuscate sensitive string data
 */
export function deobfuscateData(encoded: string): string {
  if (!encoded) return '';
  
  try {
    const decoded = atob(encoded);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
}

// ===== SECURE STORAGE =====

/**
 * Secure storage wrapper with encryption for sensitive data
 */
export const SecureStorage = {
  /**
   * Store sensitive data with obfuscation
   */
  setItem(key: string, value: string, encrypt: boolean = true): void {
    const storageValue = encrypt ? obfuscateData(value) : value;
    localStorage.setItem(`secure_${key}`, storageValue);
  },

  /**
   * Retrieve sensitive data with deobfuscation
   */
  getItem(key: string, decrypt: boolean = true): string | null {
    const value = localStorage.getItem(`secure_${key}`);
    if (!value) return null;
    return decrypt ? deobfuscateData(value) : value;
  },

  /**
   * Remove sensitive data
   */
  removeItem(key: string): void {
    localStorage.removeItem(`secure_${key}`);
  },

  /**
   * Clear all secure storage items
   */
  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('secure_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  },
};

// ===== INPUT SANITIZATION =====

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : 
        typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ===== SQL INJECTION PREVENTION =====

/**
 * Escape SQL special characters for safe query building
 */
export function escapeSqlString(value: string): string {
  if (!value) return '';
  
  return value
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Validate and sanitize field names for SQL queries
 */
export function validateFieldName(fieldName: string): boolean {
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ===== SECURITY HEADERS =====

/**
 * Security headers configuration for API requests
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Content Security Policy directives
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'https://xue3-u0pk-dusa.n7e.xano.io'],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
};

/**
 * Build CSP header string
 */
export function buildCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// ===== SENSITIVE DATA MASKING =====

/**
 * Mask sensitive data for logging/display
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(data?.length || 0);
  }
  
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.map((part, index) => 
    index === domainParts.length - 1 ? part : '*'.repeat(part.length)
  ).join('.');
  
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask financial amount for display
 */
export function maskAmount(amount: number): string {
  const str = amount.toFixed(2);
  if (str.length <= 4) return '****';
  return '*'.repeat(str.length - 4) + str.slice(-4);
}

// ===== SESSION SECURITY =====

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token: string): boolean {
  // JWT format validation
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  return jwtRegex.test(token);
}

/**
 * Check if token is expired (basic check without full JWT parsing)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

// ===== CROSS-TENANT SECURITY =====

/**
 * Validate bank ID matches current session
 */
export function validateTenantAccess(resourceBankId: string, sessionBankId: string): boolean {
  if (!resourceBankId || !sessionBankId) return false;
  if (!isValidUUID(resourceBankId) || !isValidUUID(sessionBankId)) return false;
  return resourceBankId === sessionBankId;
}

/**
 * Log security violation attempt
 */
export function logSecurityViolation(
  type: 'cross_tenant' | 'unauthorized' | 'invalid_input' | 'rate_limit',
  details: Record<string, any>
): void {
  const violation = {
    type,
    timestamp: new Date().toISOString(),
    ...details,
  };
  
  // In production, this would send to a security monitoring service
  console.warn('[SECURITY VIOLATION]', violation);
  
  // Store locally for audit
  const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
  violations.push(violation);
  // Keep only last 100 violations
  if (violations.length > 100) violations.shift();
  localStorage.setItem('security_violations', JSON.stringify(violations));
}

// ===== EXPORT =====

export const SecurityUtils = {
  obfuscateData,
  deobfuscateData,
  SecureStorage,
  sanitizeInput,
  sanitizeObject,
  escapeSqlString,
  validateFieldName,
  isValidUUID,
  SECURITY_HEADERS,
  CSP_DIRECTIVES,
  buildCSPHeader,
  maskSensitiveData,
  maskEmail,
  maskAmount,
  generateSecureToken,
  isValidSessionToken,
  isTokenExpired,
  validateTenantAccess,
  logSecurityViolation,
};

export default SecurityUtils;
