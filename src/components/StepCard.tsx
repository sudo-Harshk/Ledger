import React from 'react';

interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ stepNumber, title, description, icon }) => {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step Number Badge */}
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-palette-golden/20 rounded-full blur-xl"></div>
        <div className="relative w-16 h-16 bg-gradient-to-br from-palette-golden to-palette-deep-red rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">{stepNumber}</span>
        </div>
        <div className="absolute -top-2 -right-2 text-palette-golden">
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="bg-card-elevated rounded-xl p-6 border border-palette-golden/30 shadow-md w-full">
        <h3 className="text-lg font-bold text-palette-dark-red mb-2">{title}</h3>
        <p className="text-palette-dark-teal text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default StepCard;

