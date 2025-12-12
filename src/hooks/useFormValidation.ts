/**
 * useFormValidation Hook
 * React hook for form validation with real-time field validation
 * Requirements: 1.2 - Client-side form validation
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ValidationRule,
  ValidationResult,
  FieldValidation,
  validateField,
  validateForm,
} from '@/utils/validation';

export interface UseFormValidationOptions<T> {
  /** Initial form values */
  initialValues: T;
  /** Validation schema */
  validationSchema: FieldValidation[];
  /** Validate on change */
  validateOnChange?: boolean;
  /** Validate on blur */
  validateOnBlur?: boolean;
}

export interface UseFormValidationResult<T> {
  /** Current form values */
  values: T;
  /** Current validation errors */
  errors: Record<string, string>;
  /** Whether form has been touched */
  touched: Record<string, boolean>;
  /** Whether form is valid */
  isValid: boolean;
  /** Whether form has been modified */
  isDirty: boolean;
  /** Set a single field value */
  setValue: (field: keyof T, value: any) => void;
  /** Set multiple field values */
  setValues: (values: Partial<T>) => void;
  /** Set a field as touched */
  setTouched: (field: keyof T) => void;
  /** Set all fields as touched */
  setAllTouched: () => void;
  /** Validate a single field */
  validateSingleField: (field: keyof T) => string | null;
  /** Validate entire form */
  validate: () => ValidationResult;
  /** Reset form to initial values */
  reset: () => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Set a specific error */
  setError: (field: keyof T, error: string) => void;
  /** Get field props for input components */
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    error?: string;
  };
  /** Handle form submission */
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: React.FormEvent) => void;
}

export function useFormValidation<T extends Record<string, any>>(
  options: UseFormValidationOptions<T>
): UseFormValidationResult<T> {
  const {
    initialValues,
    validationSchema,
    validateOnChange = true,
    validateOnBlur = true,
  } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  // Check if form is dirty (modified from initial values)
  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      (key) => values[key] !== initialValues[key]
    );
  }, [values, initialValues]);

  // Check if form is valid (no errors)
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Get validation rules for a specific field
  const getFieldRules = useCallback(
    (field: keyof T): ValidationRule[] => {
      const fieldValidation = validationSchema.find((v) => v.field === field);
      return fieldValidation?.rules || [];
    },
    [validationSchema]
  );

  // Validate a single field
  const validateSingleField = useCallback(
    (field: keyof T): string | null => {
      const rules = getFieldRules(field);
      return validateField(values[field], rules, values);
    },
    [getFieldRules, values]
  );

  // Validate entire form
  const validate = useCallback((): ValidationResult => {
    const result = validateForm(values, validationSchema);
    setErrors(result.errors);
    return result;
  }, [values, validationSchema]);

  // Set a single field value
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange) {
        const rules = getFieldRules(field);
        const error = validateField(value, rules, { ...values, [field]: value });
        setErrors((prev) => {
          if (error) {
            return { ...prev, [field]: error };
          }
          const { [field]: _, ...rest } = prev;
          return rest as Record<string, string>;
        });
      }
    },
    [getFieldRules, validateOnChange, values]
  );

  // Set multiple field values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Set a field as touched
  const setTouched = useCallback(
    (field: keyof T) => {
      setTouchedState((prev) => ({ ...prev, [field]: true }));

      if (validateOnBlur) {
        const error = validateSingleField(field);
        setErrors((prev) => {
          if (error) {
            return { ...prev, [field]: error };
          }
          const { [field]: _, ...rest } = prev;
          return rest as Record<string, string>;
        });
      }
    },
    [validateOnBlur, validateSingleField]
  );

  // Set all fields as touched
  const setAllTouched = useCallback(() => {
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouchedState(allTouched);
  }, [values]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouchedState({});
  }, [initialValues]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Set a specific error
  const setError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Get field props for input components
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field] ?? '',
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      ) => {
        const { value, type } = e.target;
        const parsedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
        setValue(field, parsedValue);
      },
      onBlur: () => setTouched(field),
      error: touched[field as string] ? errors[field as string] : undefined,
    }),
    [values, errors, touched, setValue, setTouched]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) =>
      async (e: React.FormEvent) => {
        e.preventDefault();
        setAllTouched();
        const result = validate();

        if (result.isValid) {
          await onSubmit(values);
        }
      },
    [setAllTouched, validate, values]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setValues,
    setTouched,
    setAllTouched,
    validateSingleField,
    validate,
    reset,
    clearErrors,
    setError,
    getFieldProps,
    handleSubmit,
  };
}

export default useFormValidation;
