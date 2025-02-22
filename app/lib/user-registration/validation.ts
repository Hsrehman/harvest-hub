import Joi from 'joi';

export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export interface PasswordStrength {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
}

export const calculatePasswordStrength = (password: string): PasswordStrength => ({
  hasMinLength: password.length >= 8,
  hasNumber: /\d/.test(password),
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  hasUpperCase: /[A-Z]/.test(password),
});

export const validatePassword = (password: string) => Object.values(calculatePasswordStrength(password)).every(Boolean);

export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  const cleaned = phone.replace(/\D+/g, '');
  if (!cleaned) return { isValid: false, error: 'Phone number is required' };
  if (cleaned.startsWith('44') && cleaned.length === 12) phone = '0' + cleaned.slice(2);
  return /^07\d{9}$/.test(phone)
    ? { isValid: true }
    : { isValid: false, error: 'Enter a valid UK mobile number (07xxxxxxxxx)' };
};

export const userSchema = Joi.object({
  email: Joi.string().pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required().messages({ 'string.pattern.base': 'Invalid email format' }),
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  password: Joi.string().min(8).pattern(/[0-9]/).pattern(/[!@#$%^&*]/).pattern(/[A-Z]/).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Passwords do not match' }),
  accountType: Joi.string().valid('individual', 'business').required(),
  businessName: Joi.string().trim().when('accountType', { is: 'business', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  registrationNumber: Joi.string().trim().when('accountType', { is: 'business', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  businessDocument: Joi.string().allow('', null).optional(),
  phoneNumber: Joi.string().pattern(/^07\d{9}$/).when('accountType', { is: 'individual', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  dateOfBirth: Joi.string().isoDate().when('accountType', { is: 'individual', then: Joi.required(), otherwise: Joi.optional().allow('') }),
});