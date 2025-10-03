import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import React from 'react';
import { useBulkAttendance, useStudents } from '@/hooks';

export default function QuickActionsCard() {
  const { students } = useStudents();
  const { showBulkAttendance, setShowBulkAttendance, setBulkStartDate, setBulkEndDate } = useBulkAttendance(undefined, students);
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
