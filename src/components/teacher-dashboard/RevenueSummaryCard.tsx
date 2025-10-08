import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFinancialSummary, useAuth, useStudentFees } from '@/hooks';

interface RevenueSummaryCardProps {
  refreshKey?: number;
  currentMonth: Date;
}

export default function RevenueSummaryCard({ refreshKey, currentMonth }: RevenueSummaryCardProps) {
  const { user } = useAuth();
  const { studentFees } = useStudentFees(currentMonth, refreshKey);
  const { financialSummary, loading } = useFinancialSummary(user?.uid, currentMonth, refreshKey);
  return loading ? (
    <Card className="min-h-[160px] animate-pulse bg-card-elevated shadow-lg border border-palette-golden/30" />
  ) : (
    <Card className="bg-card-elevated shadow-lg border border-palette-golden/30">
      <CardHeader>
        <CardTitle className="text-lg">Total Revenue</CardTitle>
        <CardDescription>This month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-palette-golden">
              ₹{financialSummary?.revenue ?? 0}
            </p>
            <p className="text-sm text-palette-dark-teal mt-1">
              {studentFees.filter(fee => fee.monthlyFee > 0).length} students
            </p>
          </div>
          <div className="flex items-center gap-2 group" title={financialSummary?.lastUpdated ? (financialSummary.lastUpdated.toDate ? financialSummary.lastUpdated.toDate().toLocaleString() : financialSummary.lastUpdated.toLocaleString()) : ''}>
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground group-hover:underline cursor-help">
              {financialSummary?.lastUpdated
                ? `Updated ${formatDistanceToNow(financialSummary.lastUpdated.toDate ? financialSummary.lastUpdated.toDate() : financialSummary.lastUpdated)} ago`
                : 'Loading...'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
