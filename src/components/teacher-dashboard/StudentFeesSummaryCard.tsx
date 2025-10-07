import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { useStudentFees } from '@/hooks';

interface StudentFeesSummaryCardProps {
  currentMonth: Date;
  refreshKey?: number;
}

export default function StudentFeesSummaryCard({ currentMonth, refreshKey }: StudentFeesSummaryCardProps) {
  const { studentFees, loading, handleMarkAsPaid, getMonthKey } = useStudentFees(currentMonth, refreshKey);
  return loading ? (
    <Card className="mb-8 min-h-[160px] animate-pulse" />
  ) : (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Student Fees Summary</CardTitle>
        <CardDescription>Monthly fee calculation based on approved attendance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 overflow-x-auto">
          {studentFees.map((fee) => {
            const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
            const dailyRate = fee.monthlyFee > 0 ? fee.monthlyFee / totalDaysInMonth : 0;
            const monthKey = getMonthKey(currentMonth);
            // Get payment status from fee data
            const paymentStatus = fee.paymentStatus || 'unpaid';
            const paymentDate = fee.paymentDate;
            const amountPaid = fee.amountPaid;
            return (
              <div key={fee.studentId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3 border rounded-lg min-w-[260px]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-base sm:text-lg truncate">{fee.studentName}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {fee.approvedDays} approved {fee.approvedDays === 1 ? 'day' : 'days'}
                    {fee.absentDays > 0 && (
                      <span className="text-red-600"> • {fee.absentDays} absent {fee.absentDays === 1 ? 'day' : 'days'}</span>
                    )}
                    {fee.monthlyFee > 0 ? (
                      <>
                        {' '}× ₹{Math.round(dailyRate * 100) / 100} = ₹{fee.totalAmount}
                        <span className="hidden sm:inline text-xs text-gray-500">
                          {' '} (₹{fee.monthlyFee} ÷ {totalDaysInMonth} days = ₹{Math.round(dailyRate * 100) / 100}/day)
                        </span>
                      </>
                    ) : ' (No fee set)'}
                  </p>
                  {/* Payment status display */}
                  {fee.monthlyFee > 0 && (
                    <div className="mt-1">
                      {paymentStatus === 'paid' ? (
                        <span className="text-green-600 text-xs font-semibold">
                          Paid{amountPaid ? `: ₹${amountPaid}` : ''}
                                {paymentDate && (
                                  <span className="ml-2 text-gray-500 hidden sm:inline">on {new Date().toLocaleDateString()}</span>
                                )}
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(fee.studentId, monthKey)} disabled={paymentStatus === 'paid'}>
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {fee.monthlyFee > 0 ? (
                    <p className="text-lg sm:text-xl font-bold text-green-600">₹{fee.totalAmount}</p>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500">No fee</p>
                  )}
                </div>
              </div>
            );
          })}
          {studentFees.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No students with approved attendance or fees set for this month
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
