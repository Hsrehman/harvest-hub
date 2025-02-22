import Joi from 'joi';

export const userSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[0-9]/, 'number')
    .pattern(/[!@#$%^&*]/, 'special character')
    .pattern(/[A-Z]/, 'uppercase letter')
    .required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
  accountType: Joi.string().valid('individual', 'business').required(),
  businessName: Joi.string().trim().when('accountType', {
    is: 'business',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  registrationNumber: Joi.string().trim().when('accountType', {
    is: 'business',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  businessDocument: Joi.string().allow('', null).optional(),
  phoneNumber: Joi.string()
    .pattern(/^07\d{8,9}$/, 'UK mobile number')
    .when('accountType', {
      is: 'individual',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }),
  dateOfBirth: Joi.string().isoDate().when('accountType', {
    is: 'individual',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
});