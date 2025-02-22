interface PasswordStrength {
    hasMinLength: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    hasUpperCase: boolean;
  }
  
  export const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  export const calculatePasswordStrength = (password: string): PasswordStrength => {
    return {
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasUpperCase: /[A-Z]/.test(password)
    };
  };
  
  export const validatePassword = (password: string) => {
    const strength = calculatePasswordStrength(password);
    return Object.values(strength).every(check => check);
  };
  
  export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    const cleanedPhone = phone.replace(/\D+/g, ''); // Remove all non-numeric characters
  
    if (!cleanedPhone) {
      return { isValid: false, error: 'Phone number is required' };
    }
  
    if (cleanedPhone.startsWith('44') && cleanedPhone.length === 12) {
      phone = '0' + cleanedPhone.slice(2);
    }
  
    if (!/^07\d{9}$/.test(phone)) {
      return { isValid: false, error: 'Enter a valid UK mobile number (07xxxx)' };
    }
  
    return { isValid: true };
  };