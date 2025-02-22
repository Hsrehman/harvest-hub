"use client";

import React, { useState, useCallback, useRef } from 'react';
import { ArrowRight, ArrowLeft, Check, Eye, EyeOff, Building2, User } from 'lucide-react';
import UserTypeCard from './UserTypeCard';
import useDebounce from '../../hooks/useDebounce';
import { validateEmail, validatePassword, validatePhoneNumber, calculatePasswordStrength } from '@/app/utils/User-Registration/Validation';

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  accountType: 'individual' | 'business' | null;
  businessName?: string;
  registrationNumber?: string;
  businessDocument?: File | null;
  phoneNumber?: string;
  dateOfBirth?: string;
}

interface FormErrors {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
  accountType?: string;
  businessName?: string;
  registrationNumber?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

interface PasswordStrength {
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
}

interface RegistrationFormProps {
  onSubmit: (data: FormData) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    accountType: null,
    businessName: '',
    registrationNumber: '',
    businessDocument: null,
    phoneNumber: '',
    dateOfBirth: ''
  });

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasUpperCase: false
  });

  const debouncedSetPasswordStrength = useDebounce((strengthChecks: PasswordStrength) => {
    setPasswordStrength(strengthChecks);
  }, 300);

  const debouncedSetPhoneNumberError = useDebounce((error: string | undefined) => {
    setErrors(prevErrors => ({ ...prevErrors, phoneNumber: error }));
  }, 300);

  const handlePasswordChange = (password: string) => {
    const strengthChecks = calculatePasswordStrength(password);
    debouncedSetPasswordStrength(strengthChecks);
  };

  const handlePhoneNumberChange = (phone: string) => {
    const validation = validatePhoneNumber(phone);
    if (validation.isValid) {
      debouncedSetPhoneNumberError(undefined);
    } else {
      debouncedSetPhoneNumberError(validation.error);
    }
  };

  const validateStep = (currentStep: number) => {
    const newErrors: FormErrors = {};
    if (currentStep === 1) {
      if (!formData.accountType) {
        newErrors.accountType = 'Please select an account type';
      }
    }

    if (currentStep === 2) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }
    }

    if (currentStep === 3) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }

      if (formData.accountType === 'business') {
        if (!formData.businessName?.trim()) {
          newErrors.businessName = 'Business name is required';
        }
        if (!formData.registrationNumber?.trim()) {
          newErrors.registrationNumber = 'Registration number is required';
        }
      }

      if (formData.accountType === 'individual') {
        const phoneValidation = validatePhoneNumber(formData.phoneNumber || '');
        if (!phoneValidation.isValid) {
          newErrors.phoneNumber = phoneValidation.error;
        }
        if (!formData.dateOfBirth) {
          newErrors.dateOfBirth = 'Date of birth is required';
        }
      }
    }

    if (currentStep === 4) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (!validatePassword(formData.password)) {
        newErrors.password = 'Password does not meet requirements';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(4)) {
      onSubmit(formData);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Account Type</h2>
            <UserTypeCard
              title="Individual Account"
              description="Personal account for individual use"
              icon={<User size={24} />}
              isSelected={formData.accountType === 'individual'}
              onClick={() => setFormData({ ...formData, accountType: 'individual' })}
            />
            <UserTypeCard
              title="Business Account"
              description="Account for businesses and organizations"
              icon={<Building2 size={24} />}
              isSelected={formData.accountType === 'business'}
              onClick={() => setFormData({ ...formData, accountType: 'business' })}
            />
            {errors.accountType && (
              <p className="mt-1 text-sm text-red-500">{errors.accountType}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="w-full">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              What's your email?
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email address"
              className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
            <div className="mt-4 space-y-2">
              <button className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2">
                <span>G</span> Sign in with Google
              </button>
              <button className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-2">
                <span>f</span> Sign in with Facebook
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 w-full">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter your first name"
                className={`w-full px-4 py-3 rounded-lg border ${errors.firstName ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter your last name"
                className={`w-full px-4 py-3 rounded-lg border ${errors.lastName ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>

            {formData.accountType === 'business' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Enter business name"
                    className={`w-full px-4 py-3 rounded-lg border ${errors.businessName ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="Enter registration number"
                    className={`w-full px-4 py-3 rounded-lg border ${errors.registrationNumber ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors.registrationNumber && (
                    <p className="mt-1 text-sm text-red-500">{errors.registrationNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Document
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({ ...formData, businessDocument: e.target.files?.[0] || null })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload business registration document (PDF, DOC, DOCX)
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const phone = e.target.value;
                      setFormData({ ...formData, phoneNumber: phone });
                      handlePhoneNumberChange(phone);
                    }}
                    placeholder="Enter phone number"
                    className={`w-full px-4 py-3 rounded-lg border ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
                  )}

                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 w-full">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    handlePasswordChange(e.target.value);
                  }}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">Password requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'At least 8 characters', met: passwordStrength.hasMinLength },
                    { label: 'Contains a number', met: passwordStrength.hasNumber },
                    { label: 'Contains a special character', met: passwordStrength.hasSpecialChar },
                    { label: 'Contains an uppercase letter', met: passwordStrength.hasUpperCase }
                  ].map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-600' : 'bg-gray-200'
                        }`}>
                        {req.met && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 rounded-lg border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderMobileProgress = () => {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 md:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 gap-1.5 py-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
          <div className="flex gap-1.5 absolute left-1/2 -translate-x-1/2">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${step >= num ? 'bg-green-600 w-4' : 'bg-gray-200'
                  }`}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>
      </div>
    );
  };

  const renderDesktopProgress = () => {
    return (
      <div className="hidden md:flex justify-between mb-8 relative">
        {[1, 2, 3, 4].map((number) => (
          <div key={number} className="flex-1 text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2
            ${step >= number ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step > number ? <Check className="w-5 h-5" /> : number}
            </div>
            <p className={`text-sm ${step >= number ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
              {number === 1 ? 'Account Type'
                : number === 2 ? 'Email'
                  : number === 3 ? 'Personal Info'
                    : 'Password'}
            </p>
          </div>
        ))}
        <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-200 -z-10">
          <div
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {renderMobileProgress()}
      {renderDesktopProgress()}
      <div className="space-y-6">
        {getStepContent()}
        <div className="flex gap-4 pt-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <button
            onClick={step === 4 ? handleSubmit : handleNext}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {step === 4 ? 'Create Account' : 'Next'}
            {step !== 4 && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  );
};

export default RegistrationForm;