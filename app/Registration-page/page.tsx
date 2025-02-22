"use client";

import React from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import RegistrationForm from '@/app/components/Registration/RegistrationForm';
import { FormData } from '@/app/lib/user-registration/types';

const RegistrationPage: React.FC = () => {
  const handleSubmit = (formData: FormData) => {
    console.log('Form submitted:', formData);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 md:bg-gray-100">
      <Header cartTotal={0} />
      <main className="flex-grow md:py-12">
        <div className="w-full md:max-w-xl mx-auto">
          <div className="md:hidden">
            <div className="bg-white min-h-screen px-5 pt-16 pb-20">
              <RegistrationForm onSubmit={handleSubmit} />
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h1>
              <p className="text-base text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-green-600 hover:text-green-700 font-medium">Log in</a>
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-8">
              <RegistrationForm onSubmit={handleSubmit} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RegistrationPage;