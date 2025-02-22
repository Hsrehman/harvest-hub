export interface FormData {
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

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  accountType: 'individual' | 'business';
  businessName?: string;
  registrationNumber?: string;
  businessDocumentUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}