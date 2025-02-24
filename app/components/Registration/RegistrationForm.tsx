"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, Eye, EyeOff, Building2, User } from 'lucide-react';
import UserTypeCard from './UserTypeCard';
import useDebounce from '@/app/hooks/useDebounce';
import { validateEmail, validatePassword, validatePhoneNumber, calculatePasswordStrength, PasswordStrength, validateDateOfBirth, userSchema } from '@/app/lib/user-registration/validation';
import { FormData } from '@/app/lib/user-registration/types';
import { useAuth } from '@/app/user-register-context/AuthContext';
import { signIn, useSession } from 'next-auth/react';
import * as yup from 'yup';

// Extend NextAuth types for custom properties
declare module 'next-auth' {
  interface Session {
    jwt?: string;
  }
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
  general?: string;
}

interface RegistrationFormProps {
  onSubmit: (data: FormData) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [emailStatus, setEmailStatus] = useState<{ available: boolean | null; message: string }>({ available: null, message: '' });
  const [formData, setFormData] = useState<FormData>({
    email: '', firstName: '', lastName: '', password: '', confirmPassword: '', accountType: null,
    businessName: '', registrationNumber: '', businessDocument: null, phoneNumber: '', dateOfBirth: '',
  });
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false, hasNumber: false, hasSpecialChar: false, hasUpperCase: false,
  });
  const [useEmail, setUseEmail] = useState<boolean | null>(null); // Added back for social login flow
  const { jwtToken, setJwtToken, isAuthenticated } = useAuth();
  const { data: session, status } = useSession();

  const debouncedSetPasswordStrength = useDebounce((strength: PasswordStrength) => setPasswordStrength(strength), 300);
  const debouncedSetPhoneNumberError = useDebounce((error: string | undefined) => setErrors(prev => ({ ...prev, phoneNumber: error })), 300);
  const debouncedCheckEmail = useDebounce(async (email: string) => {
    if (!email || !validateEmail(email)) return setEmailStatus({ available: null, message: '' });
    try {
      const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEmailStatus({ available: data.available, message: data.message });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setEmailStatus({ available: null, message: `Error checking email: ${errorMessage}` });
    }
  }, 500);

  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, password }));
    debouncedSetPasswordStrength(calculatePasswordStrength(password));
  };

  const handlePhoneNumberChange = (phone: string) => {
    const validation = validatePhoneNumber(phone);
    debouncedSetPhoneNumberError(validation.error);
    setFormData(prev => ({ ...prev, phoneNumber: phone }));
  };

  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, email }));
    debouncedCheckEmail(email);
  };

  const validateStep = async (currentStep: number): Promise<boolean> => { // Mark as async
    const newErrors: FormErrors = {};

    switch (currentStep) {
      case 1:
        if (!formData.accountType) newErrors.accountType = 'Please select an account type';
        break;

      case 2:
        try {
          await userSchema.validateAt('email', { email: formData.email });
        } catch (error: any) {
          newErrors.email = error.message || 'Please enter a valid email';
        }
        if (!formData.email) newErrors.email = 'Email is required';
        break;

      case 3:
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';

        if (formData.accountType === 'business') {
          if (!formData.businessName?.trim()) newErrors.businessName = 'Business name is required';
          if (!formData.registrationNumber?.trim()) newErrors.registrationNumber = 'Registration number is required';
        } else if (formData.accountType === 'individual') {
          const phoneValidation = validatePhoneNumber(formData.phoneNumber || '');
          if (!phoneValidation.isValid) newErrors.phoneNumber = phoneValidation.error;
          
          const dobValidation = validateDateOfBirth(formData.dateOfBirth);
          if (!dobValidation.isValid) newErrors.dateOfBirth = dobValidation.error;
        }
        break;

      case 4:
        try {
          await userSchema.validateAt('password', { password: formData.password });
          await userSchema.validateAt('confirmPassword', { confirmPassword: formData.confirmPassword });
        } catch (error: any) {
          if (error.path === 'password') newErrors.password = error.message || 'Password must meet requirements';
          if (error.path === 'confirmPassword') newErrors.confirmPassword = error.message || 'Passwords do not match';
        }
        if (!jwtToken && !session?.jwt) newErrors.general = 'Authentication token required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => validateStep(step).then((isValid) => isValid && setStep(step + 1)); // Handle async
  const handleBack = () => {
    if (step > 1) {
      if (step === 2) setUseEmail(null);
      setStep(step - 1);
    }
  };

  const getCsrfToken = async () => {
    try {
      const res = await fetch('/api/users/csrf-token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      const { token } = await res.json();
      return token;
    } catch (error) {
      throw error;
    }
  };

  const registerUser = async (data: FormData) => {
    setSubmissionStatus('loading');

    try {
      if (!(await validateStep(4))) { // Await async validation
        setSubmissionStatus('error');
        return;
      }

      const csrfToken = await getCsrfToken();
      const payload = {
        ...data,
        businessDocument: data.businessDocument ? data.businessDocument.name : '',
        enable2FA: false, // Default to false, user can enable later
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${jwtToken || session?.jwt || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();
      setJwtToken(result.jwtToken);
      setSubmissionStatus('success');
      setErrors({});
      onSubmit(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setErrors(prev => ({ ...prev, general: errorMessage }));
      setSubmissionStatus('error');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      const result = await signIn(provider, { callbackUrl: '/Registration-page', redirect: true });
      if (result?.error) {
        setErrors({ general: `Social login failed: ${result.error}` });
      }
    } catch (error) {
      setErrors({ general: 'Social login failed. Please try again.' });
    }
  };

  const nextButtonText = () => {
    if (step === 2 && useEmail === null) return 'Next';
    return step === 4 ? 'Create Account' : 'Next';
  };

  const handleNextStep = () => {
    if (step === 2 && useEmail === null) return;
    handleNext();
  };

  const renderMobileProgress = () => (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 md:hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        {step > 1 && (
          <button onClick={handleBack} className="flex items-center text-gray-600 gap-1.5 py-1">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}
        <div className="flex gap-1.5 absolute left-1/2 -translate-x-1/2">
          {[1, 2, 3, 4].map(num => (
            <div key={num} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${step >= num ? 'bg-green-600 w-4' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="w-10" />
      </div>
    </div>
  );

  const renderDesktopProgress = () => (
    <div className="hidden md:flex justify-between mb-8 relative">
      {[1, 2, 3, 4].map(number => (
        <div key={number} className="flex-1 text-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${step >= number ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
            {step > number ? <Check className="w-5 h-5" /> : number}
          </div>
          <p className={`text-sm ${step >= number ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
            {number === 1 ? 'Account Type' : number === 2 ? 'Email' : number === 3 ? 'Personal Info' : 'Password'}
          </p>
        </div>
      ))}
      <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-200 -z-10">
        <div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }} />
      </div>
    </div>
  );

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
            {errors?.accountType && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                <span>⚠️</span> {errors.accountType}
              </p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="w-full">
            {useEmail === null ? (
              <div className="space-y-4">
                <p className="block text-sm font-medium text-gray-700 mb-1">
                  How would you like to register?
                </p>
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>G</span> Continue with Google
                </button>
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>f</span> Continue with Facebook
                </button>
                <button
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center justify-center gap-2"
                  onClick={() => setUseEmail(true)}
                >
                  Continue with Email
                </button>
              </div>
            ) : useEmail ? (
              <>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  What's your email? <span className="text-gray-500 text-xs">(e.g., user@gmail.com)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  aria-label="Email address"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Enter your email address"
                  className={`w-full px-4 py-3 rounded-lg border ${errors?.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                />
                {errors?.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                    <span>⚠️</span> {errors.email}
                  </p>
                )}
                {emailStatus.message && (
                  <p className={`mt-1 text-sm ${emailStatus.available === true ? 'text-green-600' : 'text-red-500'}`}>
                    {emailStatus.message}
                  </p>
                )}
              </>
            ) : null}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name <span className="text-gray-500 text-xs">(required)</span>
            </label>
            <input
              type="text"
              id="firstName"
              aria-label="First name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Enter your first name"
              className={`w-full px-4 py-3 rounded-lg border ${errors?.firstName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
            />
            {errors?.firstName && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                <span>⚠️</span> {errors.firstName}
              </p>
            )}

            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name <span className="text-gray-500 text-xs">(required)</span>
            </label>
            <input
              type="text"
              id="lastName"
              aria-label="Last name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Enter your last name"
              className={`w-full px-4 py-3 rounded-lg border ${errors?.lastName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
            />
            {errors?.lastName && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                <span>⚠️</span> {errors.lastName}
              </p>
            )}

            {formData.accountType === 'business' && (
              <>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                  Business Name <span className="text-gray-500 text-xs">(required)</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  aria-label="Business name"
                  value={formData.businessName || ''}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Enter your business name"
                  className={`w-full px-4 py-3 rounded-lg border ${errors?.businessName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                />
                {errors?.businessName && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                    <span>⚠️</span> {errors.businessName}
                  </p>
                )}

                <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700">
                  Registration Number <span className="text-gray-500 text-xs">(required)</span>
                </label>
                <input
                  type="text"
                  id="registrationNumber"
                  aria-label="Registration number"
                  value={formData.registrationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  placeholder="Enter your registration number"
                  className={`w-full px-4 py-3 rounded-lg border ${errors?.registrationNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                />
                {errors?.registrationNumber && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                    <span>⚠️</span> {errors.registrationNumber}
                  </p>
                )}
              </>
            )}

            {formData.accountType === 'individual' && (
              <>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number <span className="text-gray-500 text-xs">(e.g., 07xxxxxxxxx)</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  aria-label="Phone number"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="Enter your phone number"
                  className={`w-full px-4 py-3 rounded-lg border ${errors?.phoneNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                />
                {errors?.phoneNumber && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                    <span>⚠️</span> {errors.phoneNumber}
                  </p>
                )}

                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                  Date of Birth <span className="text-gray-500 text-xs">(18+ years old)</span>
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  aria-label="Date of birth"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${errors?.dateOfBirth ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                />
                {errors?.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                    <span>⚠️</span> {errors.dateOfBirth}
                  </p>
                )}
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Create Password <span className="text-gray-500 text-xs">(8+ chars, uppercase, number, special char)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                aria-label="Password"
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); handlePasswordChange(e.target.value); }}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 rounded-lg border ${errors?.password ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all pr-10`}
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
                  { label: 'Contains an uppercase letter', met: passwordStrength.hasUpperCase },
                ].map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-600' : 'bg-gray-200'}`}>
                      {req.met && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>{req.label}</span>
                  </div>
                ))}
              </div>
              <div className="w-full h-2 rounded bg-gray-200" style={{ width: `${(Object.values(passwordStrength).filter(Boolean).length / 4) * 100}%`, backgroundColor: Object.values(passwordStrength).filter(Boolean).length >= 3 ? 'green' : 'red' }} />
            </div>
            {errors?.password && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                <span>⚠️</span> {errors.password}
              </p>
            )}

            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-gray-500 text-xs">(must match)</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              aria-label="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              className={`w-full px-4 py-3 rounded-lg border ${errors?.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
            />
            {errors?.confirmPassword && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
                <span>⚠️</span> {errors.confirmPassword}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderMobileProgress()}
      {renderDesktopProgress()}
      <div className="space-y-6">
        {getStepContent()}
        
        {submissionStatus === 'loading' && <p className="mt-2 text-sm text-gray-600">Registering... Please wait.</p>}
        {submissionStatus === 'success' && <p className="mt-2 text-sm text-green-600">Registration successful! Please verify your email.</p>}
        {(submissionStatus === 'error' || errors?.general) && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1" aria-live="polite">
            <span>⚠️</span> {errors?.general || 'Registration failed. Please try again.'}
          </p>
        )}
        
        <div className="flex gap-4 pt-4">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
          )}
          <button
            onClick={async () => {
              if (step === 4) {
                await registerUser(formData);
              } else {
                handleNextStep();
              }
            }}
            disabled={
              submissionStatus === 'loading' ||
              (step === 2 && useEmail === true && emailStatus.available !== true) ||
              (step === 4 && !jwtToken && !session?.jwt)
            }
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submissionStatus === 'loading' ? 'Processing...' : nextButtonText()}
            {step !== 4 && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          This site is protected by secure authentication and the{' '}
          <a 
            href="https://policies.google.com/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-gray-700"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a 
            href="https://policies.google.com/terms" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline hover:text-gray-700"
          >
            Terms of Service
          </a>{' '}
          apply.
        </div>
      </div>
    </>
  );
};

export default RegistrationForm;