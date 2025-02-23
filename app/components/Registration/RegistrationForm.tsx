"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check, Eye, EyeOff, Building2, User } from 'lucide-react';
import UserTypeCard from './UserTypeCard';
import useDebounce from '@/app/hooks/useDebounce';
import { validateEmail, validatePassword, validatePhoneNumber, calculatePasswordStrength, PasswordStrength, validateDateOfBirth } from '@/app/lib/user-registration/validation';
import { FormData } from '@/app/lib/user-registration/types';
import { useRecaptchaV3 } from '@/app/lib/user-registration/userecaptchaV3';
import ReCAPTCHA from 'react-google-recaptcha';

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
  const [useEmail, setUseEmail] = useState<boolean | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const { ready, executeRecaptcha } = useRecaptchaV3(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!);

  const debouncedSetPasswordStrength = useDebounce((strength: PasswordStrength) => setPasswordStrength(strength), 300);
  const debouncedSetPhoneNumberError = useDebounce((error: string | undefined) => setErrors(prev => ({ ...prev, phoneNumber: error })), 300);
  const debouncedCheckEmail = useDebounce(async (email: string) => {
    if (!email || !validateEmail(email)) return setEmailStatus({ available: null, message: '' });
    try {
      const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEmailStatus({ available: data.available, message: data.message });
    } catch (error: unknown) { // Explicitly type error as unknown and handle it
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setEmailStatus({ available: null, message: `Error checking email: ${errorMessage}` });
    }
  }, 500);

  const handlePasswordChange = (password: string) => {
    const strength = calculatePasswordStrength(password);
    debouncedSetPasswordStrength(strength);
  };

  const handlePhoneNumberChange = (phone: string) => {
    const validation = validatePhoneNumber(phone);
    debouncedSetPhoneNumberError(validation.error);
    setFormData({ ...formData, phoneNumber: phone });
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });
    debouncedCheckEmail(email);
  };

  const validateStep = (currentStep: number) => {
    console.log('Validating step', currentStep, 'with formData:', formData); // Debug log
    const newErrors: FormErrors = {};
    if (currentStep === 1 && !formData.accountType) newErrors.accountType = 'Please select an account type';
    if (currentStep === 2) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email';
      else if (emailStatus.available === false) newErrors.email = 'Email already exists';
      else if (emailStatus.available === null) newErrors.email = 'Please wait for email check';
    }
    if (currentStep === 3) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (formData.accountType === 'business') {
        if (!formData.businessName?.trim()) newErrors.businessName = 'Business name is required';
        if (!formData.registrationNumber?.trim()) newErrors.registrationNumber = 'Registration number is required';
      } else if (formData.accountType === 'individual') {
        const phone = validatePhoneNumber(formData.phoneNumber || '');
        if (!phone.isValid) newErrors.phoneNumber = phone.error;
        const dateValidation = validateDateOfBirth(formData.dateOfBirth);
        if (!dateValidation.isValid) newErrors.dateOfBirth = dateValidation.error;
      }
    }
    if (currentStep === 4) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (!validatePassword(formData.password)) newErrors.password = 'Password does not meet requirements';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!recaptchaToken) newErrors.general = 'Please complete the reCAPTCHA';
      console.log('Step 4 validation errors:', newErrors); // Debug log
    }
    setErrors(newErrors);
    console.log('Validation result:', { isValid: Object.keys(newErrors).length === 0, errors: newErrors }); // Debug log
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => validateStep(step) && setStep(step + 1);
  const handleBack = () => {
    if (step > 1) {
      if (step === 2) setUseEmail(null);
      setStep(step - 1);
    }
  };

  const getCsrfToken = async () => {
    try {
      const res = await fetch('/api/csrf-token');
      if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`);
      const { token } = await res.json();
      console.log('CSRF Token fetched:', token); // Debug log
      return token;
    } catch (error: unknown) { // Explicitly type error as unknown and handle it
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('CSRF Token error:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const registerUser = async (data: FormData) => {
    console.log('Attempting to register with data:', data); // Debug log
    setSubmissionStatus('loading');
    try {
      if (!recaptchaToken) throw new Error('reCAPTCHA not completed');
      const csrfToken = await getCsrfToken();
      console.log('CSRF Token:', csrfToken); // Debug log
      const payload = { ...data, businessDocument: data.businessDocument ? data.businessDocument.name : '', recaptchaToken };
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken || '' }, // Allow empty token if fetch fails
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Registration failed with:', errorData); // Debug log
        throw new Error(errorData.error || 'Registration failed');
      }
      const result = await response.json();
      setSubmissionStatus('success');
      setErrors({});
      setTimeout(() => setSubmissionStatus('idle'), 3000);
      console.log('Registration successful:', result); // Debug log
    } catch (error: unknown) { // Explicitly type error as unknown and handle it
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Registration error:', errorMessage); // Debug log
      setErrors({ general: errorMessage });
      setSubmissionStatus('error');
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called, step:', step, 'recaptchaToken:', recaptchaToken, 'submissionStatus:', submissionStatus, 'errors:', errors); // Enhanced debug log
    if (validateStep(4)) {
      await registerUser(formData);
      if (submissionStatus === 'success') onSubmit(formData);
    } else {
      console.log('Validation failed, errors:', errors); // Debug log
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
            {errors?.accountType && (
              <p className="mt-1 text-sm text-red-500">{errors.accountType}</p>
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
                  className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-2"
                  onClick={() => setUseEmail(false)}
                >
                  <span>G</span> Continue with Google
                </button>
                <button
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-2"
                  onClick={() => setUseEmail(false)}
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
                  What's your email?
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Enter your email address"
                  className={`w-full px-4 py-3 rounded-lg border ${errors?.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                />
                {errors?.email ? (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                ) : emailStatus.available === false ? (
                  <p className="mt-1 text-sm text-red-500">
                    {emailStatus.message}.
                  </p>
                ) : emailStatus.available === true ? (
                  <p className="mt-1 text-sm text-green-600">{emailStatus.message}</p>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">Checking email availability...</p>
                )}
              </>
            ) : null}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 w-full">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter your first name"
                className={`w-full px-4 py-3 rounded-lg border ${errors?.firstName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
              />
              {errors?.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter your last name"
                className={`w-full px-4 py-3 rounded-lg border ${errors?.lastName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
              />
              {errors?.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
            </div>
            {formData.accountType === 'business' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Enter business name"
                    className={`w-full px-4 py-3 rounded-lg border ${errors?.businessName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors?.businessName && <p className="mt-1 text-sm text-red-500">{errors.businessName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="Enter registration number"
                    className={`w-full px-4 py-3 rounded-lg border ${errors?.registrationNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors?.registrationNumber && <p className="mt-1 text-sm text-red-500">{errors.registrationNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Document</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({ ...formData, businessDocument: e.target.files?.[0] || null })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload business registration document (PDF, DOC, DOCX)</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    placeholder="Enter phone number"
                    className={`w-full px-4 py-3 rounded-lg border ${errors?.phoneNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors?.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth || ''} // Default to empty string if undefined
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    min="1900-01-01" // Limit earliest year
                    max={new Date().toISOString().split('T')[0]} // Limit to today
                    className={`w-full px-4 py-3 rounded-lg border ${errors?.dateOfBirth ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
                  />
                  {errors?.dateOfBirth && <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>}
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 w-full">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
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
              </div>
              {errors?.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 rounded-lg border ${errors?.confirmPassword ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all`}
              />
              {errors?.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
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

  const nextButtonText = () => {
    if (step === 2 && useEmail === null) return 'Next';
    return step === 4 ? 'Create Account' : 'Next';
  };

  const handleNextStep = () => {
    if (step === 2 && useEmail === null) return;
    handleNext();
  };

  useEffect(() => {
    const runRecaptcha = async () => {
      if (step === 4 && ready) {
        try {
          const token = await executeRecaptcha('register');
          setRecaptchaToken(token);
          console.log('reCAPTCHA token received:', token); // Debug log
        } catch (error: unknown) { // Explicitly type error as unknown and handle it
          const errorMessage = error instanceof Error ? error.message : 'Unknown reCAPTCHA error';
          console.error('Recaptcha error:', errorMessage);
          setRecaptchaToken('dummy-token'); // Temporary fallback for testing, remove in production
        }
      }
    };
    runRecaptcha();
  }, [step, ready, executeRecaptcha]);

  return (
    <>
      {renderMobileProgress()}
      {renderDesktopProgress()}
      <div className="space-y-6">
        {getStepContent()}
        <ReCAPTCHA
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
          size="invisible"
          onChange={(token) => {
            setRecaptchaToken(token);
            console.log('reCAPTCHA token from component:', token); // Debug log
          }}
        />
        {submissionStatus === 'loading' && <p className="mt-2 text-sm text-gray-600">Registering... Please wait.</p>}
        {submissionStatus === 'success' && <p className="mt-2 text-sm text-green-600">Registration successful! Please verify your email.</p>}
        {(submissionStatus === 'error' || errors?.general) && <p className="mt-1 text-sm text-red-500">{errors?.general || 'Registration failed. Please try again.'}</p>}
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
            onClick={() => {
              console.log('Button clicked before handler, step:', step, 'text:', nextButtonText(), 'recaptchaToken:', recaptchaToken);
              if (nextButtonText() === 'Create Account') {
                handleSubmit().catch(error => console.error('Handle submit error:', error));
              } else {
                handleNextStep();
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            disabled={submissionStatus === 'loading' || (step === 2 && emailStatus.available !== true) || (step === 4 && !recaptchaToken)}
            onMouseDown={(e) => console.log('Button clicked, disabled:', e.currentTarget.disabled)} // Debug button click
          >
            {submissionStatus === 'loading' && step === 4 ? 'Processing...' : nextButtonText()}
            {step !== 4 && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  );
};

export default RegistrationForm;