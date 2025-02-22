import Joi from 'joi';

export const userSchema = Joi.object({
  id: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  password: Joi.string().min(8).required(), // Frontend validation only
  accountType: Joi.string().valid('individual', 'business').required(),
  businessName: Joi.string().optional(),
  registrationNumber: Joi.string().optional(),
  businessDocument: Joi.string().optional(), // URL or file path
  phoneNumber: Joi.string().optional(),
  dateOfBirth: Joi.string().isoDate().optional(),
});