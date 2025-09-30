import React from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { CalendarIcon, AlertTriangle } from "lucide-react";

interface DueDateBannerProps {
  dueDate: Date;
  daysUntilDue: number;
  paymentStatus?: string | null;
}

const DueDateBanner: React.FC<DueDateBannerProps> = ({ dueDate, daysUntilDue, paymentStatus }) => {
  const formattedDueDate = format(dueDate, 'EEEE, MMMM do, yyyy');
  const isOverdue = daysUntilDue < 0 && paymentStatus !== 'paid';

  return (
    <Card className={`relative overflow-hidden w-full max-w-full ${isOverdue ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200' : 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200'}`}>
      <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 py-4 sm:px-6 sm:py-5">
        {/* Icon centered on mobile, left on desktop */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/70 dark:bg-black/20 mb-2 sm:mb-0 sm:mr-3">
          {isOverdue ? <AlertTriangle className="h-7 w-7 text-red-500" /> : <CalendarIcon className="h-7 w-7 text-yellow-500" />}
        </div>
        {/* Text content */}
        <div className="flex-1 w-full text-center sm:text-left">
          <CardHeader className="p-0 mb-1 flex flex-col items-center sm:items-start">
            <CardTitle className="text-base sm:text-lg font-semibold">
              {isOverdue ? 'Payment Overdue!' : 'Payment Due Soon!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CardDescription className="text-sm sm:text-base">
              {isOverdue ? (
                <span>
                  Your monthly fee was due on <span className="font-bold">{formattedDueDate}</span>.<br />
                  Please pay as soon as possible to avoid penalties.
                </span>
              ) : (
                <span>
                  Your monthly fee is due on <span className="font-bold">{formattedDueDate}</span>.<br />
                  {daysUntilDue === 0 ? (
                    <span className="font-bold text-[#F87171]">Today is the last day to make the payment.</span>
                  ) : (
                    <>You have <span className="font-bold">{daysUntilDue}</span> days remaining to make the payment.</>
                  )}
                </span>
              )}
            </CardDescription>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

export default DueDateBanner;
