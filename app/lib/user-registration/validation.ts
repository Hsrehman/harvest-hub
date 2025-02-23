import Joi from 'joi';
import validator from 'validator';

// Interface for Password Strength
export interface PasswordStrength {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
}

// Email Validation
export function validateEmail(email: string): boolean {
  return validator.isEmail(email.trim());
}

// Password Validation
export function validatePassword(password: string): boolean {
  if (!password) return false;
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

// Password Strength Calculation (for UI feedback)
export function calculatePasswordStrength(password: string): PasswordStrength {
  return {
    hasMinLength: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasUpperCase: /[A-Z]/.test(password),
  };
}

// Phone Number Validation (UK mobile, e.g., 07xxxxxxxxx)
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone) return { isValid: false, error: 'Phone number is required' };
  const trimmedPhone = phone.trim();
  const ukMobilePattern = /^07\d{9}$/;
  if (!ukMobilePattern.test(trimmedPhone)) {
    return { isValid: false, error: 'Enter a valid UK mobile number (07xxxxxxxxx)' };
  }
  return { isValid: true };
}

// Date of Birth Validation (UK age limits: 18+ min, 120 max, years 1900–current)
export function validateDateOfBirth(dateOfBirth: string | undefined): { isValid: boolean; error?: string } {
  if (!dateOfBirth) return { isValid: false, error: 'Date of birth is required' };

  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) return { isValid: false, error: 'Invalid date format' };

  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();

  // Adjust age if birthday hasn't occurred this year
  let calculatedAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    calculatedAge--;
  }

  const MIN_AGE = 18;
  const MAX_AGE = 100;
  const MIN_YEAR = today.getFullYear() - MAX_AGE; 
  const MAX_YEAR = today.getFullYear();

  if (calculatedAge < MIN_AGE) {
    return { isValid: false, error: `Must be at least ${MIN_AGE} years old` };
  }
  if (calculatedAge > MAX_AGE) {
    return { isValid: false, error: `Cannot be older than ${MAX_AGE} years` };
  }
  if (date.getFullYear() < MIN_YEAR || date.getFullYear() > MAX_YEAR) {
    return { isValid: false, error: `Year must be between ${MIN_YEAR} and ${MAX_YEAR}` };
  }

  return { isValid: true };
}

// Joi Schema for Server-Side Validation
export const userSchema = Joi.object({
  email: Joi.string().custom((value, helpers) => {
    if (!validateEmail(value)) {
      return helpers.error('string.pattern.base', { label: 'email', value });
    }
    return value;
  }, 'Email Validation').required().messages({ 'string.pattern.base': 'Invalid email format' }),
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  password: Joi.string().min(8).pattern(/[0-9]/).pattern(/[!@#$%^&*]/).pattern(/[A-Z]/).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Passwords do not match' }),
  accountType: Joi.string().valid('individual', 'business').required(),
  businessName: Joi.string().trim().when('accountType', { is: 'business', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  registrationNumber: Joi.string().trim().when('accountType', { is: 'business', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  businessDocument: Joi.string().allow('', null).optional(),
  phoneNumber: Joi.string().custom((value, helpers) => {
    const validation = validatePhoneNumber(value);
    if (!validation.isValid) {
      return helpers.error('string.pattern.base', { label: 'phoneNumber', value });
    }
    return value;
  }, 'Phone Validation').when('accountType', { is: 'individual', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  dateOfBirth: Joi.string().custom((value, helpers) => {
    const validation = validateDateOfBirth(value);
    if (!validation.isValid) {
      return helpers.error('string.pattern.base', { label: 'dateOfBirth', value });
    }
    return value;
  }, 'Date of Birth Validation').when('accountType', { is: 'individual', then: Joi.required(), otherwise: Joi.optional().allow('') }),
});