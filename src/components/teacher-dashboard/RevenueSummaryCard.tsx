import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFinancialSummary, useAuth, useCalendar, useStudentFees } from '@/hooks';

export default function RevenueSummaryCard() {
  const { user } = useAuth();
  const { currentMonth } = useCalendar();
  const { studentFees } = useStudentFees(currentMonth);
  const { financialSummary, loading } = useFinancialSummary(user?.uid, currentMonth);
  return loading ? (
    <Card className="min-h-[160px] animate-pulse" />
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Total Revenue</CardTitle>
        <CardDescription>This month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-green-600">
              ₹{financialSummary?.revenue ?? 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {studentFees.filter(fee => fee.monthlyFee > 0).length} students
            </p>
          </div>
          <div className="flex items-center gap-2 group" title={financialSummary?.lastUpdated ? financialSummary.lastUpdated.toDate().toLocaleString() : ''}>
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground group-hover:underline cursor-help">
              {financialSummary?.lastUpdated
                ? `Updated ${formatDistanceToNow(financialSummary.lastUpdated.toDate())} ago`
                : 'Loading...'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
