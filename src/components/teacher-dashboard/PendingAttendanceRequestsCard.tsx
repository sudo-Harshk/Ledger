import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { usePendingRequests, useAuth } from '@/hooks';

export default function PendingAttendanceRequestsCard() {
  const { user } = useAuth();
  const { pendingRequests, loading, approveAttendance } = usePendingRequests(user?.uid);
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
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{request.studentName || ''}</p>
                  <p className="text-sm text-gray-600">
                    {request.date ? new Date(request.date).toLocaleDateString() : ''} at {request.timestamp ? new Date(request.timestamp).toLocaleTimeString() : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveAttendance(request.id, 'approved')}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
