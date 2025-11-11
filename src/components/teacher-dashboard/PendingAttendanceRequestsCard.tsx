import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { usePendingRequests, useAuth } from '@/hooks';
import { Timestamp } from 'firebase/firestore';
import type { PendingRequestWithStatus } from '@/hooks/usePendingRequests';

export default function PendingAttendanceRequestsCard() {
  const { user } = useAuth();
  const { pendingRequests, loading, approveAttendance } = usePendingRequests(user?.uid);
  
  const convertToDate = (value: Date | Timestamp | string | undefined): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'string') return new Date(value);
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Attendance Requests</CardTitle>
        <CardDescription>Approve or reject student attendance</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request: PendingRequestWithStatus) => {
              const dateObj = request.date ? new Date(request.date) : null;
              const timestampObj = convertToDate(request.timestamp);
              const isStudentActive = request.isStudentActive !== false;
              const isInactive = request.isStudentActive === false;
              
              return (
                <div 
                  key={request.id} 
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isInactive ? 'bg-gray-50 opacity-90' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.studentName || ''}</p>
                      {isInactive && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                          Discontinued
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {dateObj ? dateObj.toLocaleDateString() : ''} at {timestampObj ? timestampObj.toLocaleTimeString() : ''}
                    </p>
               {isInactive && (
                 <p className="text-xs text-orange-600 mt-1 font-medium">
                   ⚠️ Student account is discontinued. Please reactivate the student before approving attendance.
                 </p>
               )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveAttendance(request.id, 'approved')}
                      disabled={loading || isInactive}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isInactive ? 'Cannot approve: Student account is discontinued' : 'Approve attendance'}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveAttendance(request.id, 'rejected')}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
