import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';

interface QuickActionsCardProps {
  showBulkAttendance: boolean;
  setShowBulkAttendance: (show: boolean) => void;
  setBulkStartDate: (date: string) => void;
  setBulkEndDate: (date: string) => void;
}

export default function QuickActionsCard({ showBulkAttendance, setShowBulkAttendance, setBulkStartDate, setBulkEndDate }: QuickActionsCardProps) {
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => {
            if (showBulkAttendance) {
              setBulkStartDate('');
              setBulkEndDate('');
            }
            setShowBulkAttendance(!showBulkAttendance);
          }}
          variant="outline"
          className="w-full"
        >
          {showBulkAttendance ? 'Hide Bulk Attendance' : 'Show Bulk Attendance'}
        </Button>
      </CardContent>
    </Card>
  );
}
