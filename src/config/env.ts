/**
 * Environment variable handling for both Vite and Jest
 */

// Environment variables interface
interface EnvVars {
  VITE_API_BASE_URL: string;
  VITE_ENV: string;
  VITE_ENABLE_PBT: string;
  VITE_ENABLE_AUDIT_LOGS: string;
  VITE_ENABLE_MULTI_TENANT: string;
  VITE_XANO_WORKSPACE_ID: string;
  VITE_GEMINI_API_KEY: string;
}

// Default values
const defaults: EnvVars = {
  VITE_API_BASE_URL: 'https://xue3-u0pk-dusa.n7e.xano.io',
  VITE_ENV: 'development',
  VITE_ENABLE_PBT: 'true',
  VITE_ENABLE_AUDIT_LOGS: 'true',
  VITE_ENABLE_MULTI_TENANT: 'true',
  VITE_XANO_WORKSPACE_ID: '',
  VITE_GEMINI_API_KEY: '',
};

// Detect if we're in a browser/Vite environment or Node/Jest
const isBrowser = typeof window !== 'undefined';

// Get environment variable with fallback
export const getEnvVar = (key: keyof EnvVars): string => {
  // In browser (Vite), use import.meta.env
  if (isBrowser) {
    // @ts-ignore - import.meta.env is available in Vite
    const value = import.meta.env?.[key];
    return value || defaults[key];
  }
  
  // In Node (Jest), use process.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (typeof process !== 'undefined' && (process as any).env?.[key]) || defaults[key];
};

// Environment configuration
export const ENV = {
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL'),
  ENVIRONMENT: getEnvVar('VITE_ENV'),
  ENABLE_PBT: getEnvVar('VITE_ENABLE_PBT') === 'true',
  ENABLE_AUDIT_LOGS: getEnvVar('VITE_ENABLE_AUDIT_LOGS') === 'true',
  ENABLE_MULTI_TENANT: getEnvVar('VITE_ENABLE_MULTI_TENANT') === 'true',
  XANO_WORKSPACE_ID: getEnvVar('VITE_XANO_WORKSPACE_ID'),
  GEMINI_API_KEY: getEnvVar('VITE_GEMINI_API_KEY'),
};
