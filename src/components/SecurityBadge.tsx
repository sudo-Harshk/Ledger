import React from 'react';

interface SecurityBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const SecurityBadge: React.FC<SecurityBadgeProps> = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card-base rounded-lg p-5 border border-palette-golden/20">
      <div className="flex-shrink-0 p-3 bg-palette-golden/10 rounded-lg text-palette-deep-red">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-palette-dark-red mb-1">{title}</h4>
        <p className="text-sm text-palette-dark-teal">{description}</p>
      </div>
    </div>
  );
};

export default SecurityBadge;

