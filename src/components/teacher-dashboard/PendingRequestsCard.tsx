import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { usePendingRequests, useAuth } from '@/hooks';

export default function PendingRequestsCard() {
  const { user } = useAuth();
  const { pendingRequests, loading } = usePendingRequests(user?.uid);
  return loading ? (
    <Card className="min-h-[160px] animate-pulse" />
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending Requests</CardTitle>
        <CardDescription>Attendance requests</CardDescription>
      </CardHeader>
      <CardContent>
        <>
          <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
          <p className="text-sm text-gray-600 mt-1">
            {pendingRequests.length === 1 ? 'request' : 'requests'} pending
          </p>
        </>
      </CardContent>
    </Card>
  );
}
