import * as yup from 'yup'; // Replace zod import
import validator from 'validator';

// Interface for Password Strength
export interface PasswordStrength {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
}

// Email Validation (Blocklist with TLD checks)
export function validateEmail(email: string): boolean {
  const trimmedEmail = email.trim();
  if (!validator.isEmail(trimmedEmail)) {
    return false;
  }

  const emailParts = trimmedEmail.split('@');
  if (emailParts.length !== 2) {
    return false;
  }

  const domain = emailParts[1].toLowerCase();
  const blocklistDomains = [
    'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'throwawaymail.com',
    'yopmail.com', 'dispostable.com', 'getairmail.com', 'trashmail.com', 'maildrop.cc',
  ];

  // Check if domain is in blocklist
  if (blocklistDomains.includes(domain)) {
    return false;
  }

  // Ensure valid TLD (simplified list, can expand as needed)
  const tldRegex = /\.(com|org|net|edu|gov|co|uk|ca|au|in|io|me|xyz|info)$/i;
  if (!tldRegex.test(domain)) {
    return false;
  }

  return true;
}

// Password Validation with zxcvbn
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

// Date of Birth Validation (UK age limits: 18+ min, 100 max, years 1925–current)
export function validateDateOfBirth(dateOfBirth: string | undefined): { isValid: boolean; error?: string } {
  if (!dateOfBirth) return { isValid: false, error: 'Date of birth is required' };

  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) return { isValid: false, error: 'Invalid date format' };

  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();

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

// Yup Schema for Server-Side and Client-Side Validation
export const userSchema = yup.object({
  email: yup.string().trim().required().test('email', 'Invalid email format', (value) => validateEmail(value || '')),
  firstName: yup.string().trim().required(),
  lastName: yup.string().trim().required(),
  password: yup.string().min(8).matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a special character')
    .required(),
  confirmPassword: yup.string().required().oneOf([yup.ref('password')], 'Passwords do not match'),
  accountType: yup.string().oneOf(['individual', 'business']).required(),
  businessName: yup.string().trim().when('accountType', {
    is: 'business',
    then: yup.string().required('Business name is required'),
    otherwise: yup.string().optional().default(''),
  }),
  registrationNumber: yup.string().trim().when('accountType', {
    is: 'business',
    then: yup.string().required('Registration number is required'),
    otherwise: yup.string().optional().default(''),
  }),
  businessDocument: yup.string().nullable().optional(),
  phoneNumber: yup.string().when('accountType', {
    is: 'individual',
    then: yup.string().required('Phone number is required').test('phone', 'Invalid UK mobile number', (value) => validatePhoneNumber(value || '').isValid),
    otherwise: yup.string().optional().nullable(),
  }),
  dateOfBirth: yup.string().when('accountType', {
    is: 'individual',
    then: yup.string().required('Date of birth is required').test('dob', 'Invalid date of birth', (value) => validateDateOfBirth(value || '').isValid),
    otherwise: yup.string().optional().nullable(),
  }),
}).defined();

// Type for Yup validation result
export type UserValidation = yup.InferType<typeof userSchema>;