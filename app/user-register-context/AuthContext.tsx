import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthContextType {
  jwtToken: string | null;
  setJwtToken: (token: string | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const isAuthenticated = status === 'authenticated' || !!jwtToken;

  return (
    <AuthContext.Provider value={{ jwtToken, setJwtToken, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}