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