import React from 'react';
import { Check } from 'lucide-react';

interface UserTypeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  onClick: () => void;
  variant?: 'selection' | 'form';
}

const UserTypeCard: React.FC<UserTypeCardProps> = ({ title, description, icon, isSelected, onClick, variant = 'form' }) => (
  <div
    onClick={onClick}
    className={
      variant === 'form'
        ? `relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`
        : `relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`
    }
  >
    <div className="flex gap-4">
      <div className={`${isSelected ? 'text-green-600' : 'text-gray-400'}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {isSelected && (
        <div className="absolute top-4 right-4">
          <Check className="w-5 h-5 text-green-600" />
        </div>
      )}
    </div>
  </div>
);

export default UserTypeCard;