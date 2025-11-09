import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFinancialSummary, useAuth, useStudentFees } from '@/hooks';
import { Timestamp } from 'firebase/firestore';

interface RevenueSummaryCardProps {
  refreshKey?: number;
  currentMonth: Date;
}

export default function RevenueSummaryCard({ refreshKey, currentMonth }: RevenueSummaryCardProps) {
  const { user } = useAuth();
  const { studentFees } = useStudentFees(currentMonth, refreshKey);
  const { financialSummary, loading } = useFinancialSummary(user?.uid, currentMonth, refreshKey);
  
  const getLastUpdatedDate = (lastUpdated: Timestamp | null | undefined): Date | null => {
    if (!lastUpdated) return null;
    if (lastUpdated instanceof Timestamp) return lastUpdated.toDate();
    return null;
  };

  const lastUpdatedDate = getLastUpdatedDate(financialSummary?.lastUpdated);
  
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
          <div className="flex items-center gap-2 group" title={lastUpdatedDate ? lastUpdatedDate.toLocaleString() : ''}>
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground group-hover:underline cursor-help">
              {lastUpdatedDate
                ? `Updated ${formatDistanceToNow(lastUpdatedDate)} ago`
                : 'Loading...'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
