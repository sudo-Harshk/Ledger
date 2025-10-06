import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface DebugBulkAttendanceProps {
  students: any[];
  selectedStudents: string[];
  filteredAttendanceData: {
    presentDates: Set<string>;
    absentDates: Set<string>;
    studentAttendanceData: Record<string, { presentDates: Set<string>, absentDates: Set<string> }>;
  };
  currentMonth: Date;
}

export default function DebugBulkAttendance({ 
  students, 
  selectedStudents, 
  filteredAttendanceData, 
  currentMonth 
}: DebugBulkAttendanceProps) {
  return (
    <Card className="mb-4 border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-sm text-red-800">Debug Bulk Attendance</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-red-700">
        <div className="space-y-1">
          <div><strong>Students Count:</strong> {students.length}</div>
          <div><strong>Selected Students:</strong> {selectedStudents.length}</div>
          <div><strong>Selected IDs:</strong> {selectedStudents.join(', ')}</div>
          <div><strong>Current Month:</strong> {currentMonth.toLocaleDateString()}</div>
          <div><strong>Present Dates:</strong> {Array.from(filteredAttendanceData.presentDates).join(', ')}</div>
          <div><strong>Absent Dates:</strong> {Array.from(filteredAttendanceData.absentDates).join(', ')}</div>
          <div><strong>Student Data Keys:</strong> {Object.keys(filteredAttendanceData.studentAttendanceData).join(', ')}</div>
        </div>
      </CardContent>
    </Card>
  );
}
