import Joi from 'joi';

export const userSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  password: Joi.string().min(8).required(), // Frontend validation only
  accountType: Joi.string().valid('individual', 'business').required(),
  businessName: Joi.string().optional().allow(''),
  registrationNumber: Joi.string().optional().allow(''),
  businessDocument: Joi.string().optional().allow(''), // URL or file path
  phoneNumber: Joi.string().optional(),
  dateOfBirth: Joi.string().isoDate().optional(),
});