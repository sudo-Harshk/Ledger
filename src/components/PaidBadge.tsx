import React from 'react';

interface PaidBadgeProps {
  paymentDate?: Date | null;
}

function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const PaidBadge: React.FC<PaidBadgeProps> = ({ paymentDate }) => {
  return (
    <span
      className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold cursor-pointer border border-green-300 whitespace-nowrap"
      title={paymentDate ? `Paid on ${formatDateDDMMYYYY(paymentDate)}` : 'Paid'}
      style={{ marginLeft: 'auto' }}
    >
      Paid
    </span>
  );
};

export default PaidBadge;
