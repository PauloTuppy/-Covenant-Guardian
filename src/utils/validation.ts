/**
 * Form Validation Utilities
 * Client-side validation for forms with reusable validators
 * Requirements: 1.2 - Input validation for contracts
 */

export interface ValidationRule {
  validate: (value: any, formData?: Record<string, any>) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidation {
  field: string;
  rules: ValidationRule[];
}

// ===== BUILT-IN VALIDATORS =====

export const validators = {
  /**
   * Required field validator
   */
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  /**
   * Minimum length validator
   */
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty values
      return String(value).length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  /**
   * Maximum length validator
   */
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return String(value).length <= max;
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  /**
   * Email format validator
   */
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value));
    },
    message,
  }),

  /**
   * Numeric value validator
   */
  numeric: (message = 'Must be a valid number'): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return !isNaN(Number(value));
    },
    message,
  }),

  /**
   * Minimum value validator
   */
  min: (minValue: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number(value) >= minValue;
    },
    message: message || `Must be at least ${minValue}`,
  }),

  /**
   * Maximum value validator
   */
  max: (maxValue: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number(value) <= maxValue;
    },
    message: message || `Must be no more than ${maxValue}`,
  }),

  /**
   * Positive number validator
   */
  positive: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number(value) > 0;
    },
    message,
  }),

  /**
   * Date validator
   */
  date: (message = 'Please enter a valid date'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message,
  }),

  /**
   * Date must be after another date
   */
  dateAfter: (
    compareField: string,
    message?: string
  ): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData?.[compareField]) return true;
      const date = new Date(value);
      const compareDate = new Date(formData[compareField]);
      return date > compareDate;
    },
    message: message || `Date must be after ${compareField}`,
  }),

  /**
   * Date must be before another date
   */
  dateBefore: (
    compareField: string,
    message?: string
  ): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData?.[compareField]) return true;
      const date = new Date(value);
      const compareDate = new Date(formData[compareField]);
      return date < compareDate;
    },
    message: message || `Date must be before ${compareField}`,
  }),

  /**
   * Future date validator
   */
  futureDate: (message = 'Date must be in the future'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return date > new Date();
    },
    message,
  }),

  /**
   * Pattern/regex validator
   */
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(String(value));
    },
    message,
  }),

  /**
   * Custom validator
   */
  custom: (
    validateFn: (value: any, formData?: Record<string, any>) => boolean,
    message: string
  ): ValidationRule => ({
    validate: validateFn,
    message,
  }),

  /**
   * File size validator (in bytes)
   */
  fileSize: (maxSize: number, message?: string): ValidationRule => ({
    validate: (value: File | null) => {
      if (!value) return true;
      return value.size <= maxSize;
    },
    message: message || `File size must be less than ${formatFileSize(maxSize)}`,
  }),

  /**
   * File type validator
   */
  fileType: (allowedTypes: string[], message?: string): ValidationRule => ({
    validate: (value: File | null) => {
      if (!value) return true;
      return allowedTypes.includes(value.type);
    },
    message: message || `File type must be one of: ${allowedTypes.join(', ')}`,
  }),

  /**
   * Range validator (inclusive)
   */
  range: (minValue: number, maxValue: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === '') return true;
      const num = Number(value);
      return num >= minValue && num <= maxValue;
    },
    message: message || `Must be between ${minValue} and ${maxValue}`,
  }),
};

// ===== VALIDATION FUNCTIONS =====

/**
 * Validate a single field against its rules
 */
export function validateField(
  value: any,
  rules: ValidationRule[],
  formData?: Record<string, any>
): string | null {
  for (const rule of rules) {
    if (!rule.validate(value, formData)) {
      return rule.message;
    }
  }
  return null;
}

/**
 * Validate an entire form
 */
export function validateForm(
  formData: Record<string, any>,
  validations: FieldValidation[]
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const { field, rules } of validations) {
    const error = validateField(formData[field], rules, formData);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Create a validation schema for a form
 */
export function createValidationSchema(
  schema: Record<string, ValidationRule[]>
): FieldValidation[] {
  return Object.entries(schema).map(([field, rules]) => ({
    field,
    rules,
  }));
}

// ===== CONTRACT VALIDATION SCHEMA =====

export const contractValidationSchema = createValidationSchema({
  borrower_id: [validators.required('Please select a borrower')],
  contract_name: [
    validators.required('Contract name is required'),
    validators.minLength(3, 'Contract name must be at least 3 characters'),
    validators.maxLength(200, 'Contract name must be less than 200 characters'),
  ],
  principal_amount: [
    validators.required('Principal amount is required'),
    validators.numeric('Principal amount must be a valid number'),
    validators.positive('Principal amount must be greater than 0'),
  ],
  currency: [validators.required('Currency is required')],
  origination_date: [
    validators.required('Origination date is required'),
    validators.date('Please enter a valid origination date'),
  ],
  maturity_date: [
    validators.required('Maturity date is required'),
    validators.date('Please enter a valid maturity date'),
    validators.dateAfter('origination_date', 'Maturity date must be after origination date'),
  ],
  interest_rate: [
    validators.numeric('Interest rate must be a valid number'),
    validators.range(0, 100, 'Interest rate must be between 0 and 100'),
  ],
});

// ===== FINANCIAL DATA VALIDATION SCHEMA =====

export const financialDataValidationSchema = createValidationSchema({
  period_date: [
    validators.required('Period date is required'),
    validators.date('Please enter a valid date'),
  ],
  period_type: [validators.required('Period type is required')],
  source: [validators.required('Data source is required')],
});

// ===== BORROWER VALIDATION SCHEMA =====

export const borrowerValidationSchema = createValidationSchema({
  legal_name: [
    validators.required('Legal name is required'),
    validators.minLength(2, 'Legal name must be at least 2 characters'),
    validators.maxLength(200, 'Legal name must be less than 200 characters'),
  ],
});

// ===== HELPER FUNCTIONS =====

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Hook-friendly validation helper
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: FieldValidation[]
) {
  return {
    validate: (formData: T): ValidationResult => validateForm(formData, schema),
    validateField: (field: keyof T, value: any, formData: T): string | null => {
      const fieldValidation = schema.find((v) => v.field === field);
      if (!fieldValidation) return null;
      return validateField(value, fieldValidation.rules, formData);
    },
  };
}
