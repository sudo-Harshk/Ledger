import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, highlight = false }) => {
  return (
    <div 
      className={`
        relative bg-card-elevated rounded-xl p-6 border transition-all duration-300
        ${highlight 
          ? 'border-palette-golden shadow-lg' 
          : 'border-palette-golden/30 shadow-md hover:shadow-lg'
        }
      `}
    >
      <div className="flex flex-col items-start gap-4">
        <div className={`
          p-3 rounded-lg transition-colors duration-300
          ${highlight 
            ? 'bg-palette-golden/20 text-palette-deep-red' 
            : 'bg-palette-golden/10 text-palette-dark-red'
          }
        `}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-palette-dark-red mb-2">{title}</h3>
          <p className="text-palette-dark-teal leading-relaxed">{description}</p>
        </div>
      </div>
      {highlight && (
        <div className="absolute -top-2 -right-2 bg-palette-golden text-white text-xs font-semibold px-2 py-1 rounded-full">
          Popular
        </div>
      )}
    </div>
  );
};

export default FeatureCard;

