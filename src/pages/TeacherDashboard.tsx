import { useAuth, useBulkAttendance, useStudents } from '@/hooks';
import { useState, useCallback, useEffect } from 'react';
import { Navigation, Footer } from '@/components';
import { 
  AccountSettingsCard,
  InitialSetupCard,
  MonthlyFeeSettingsCard,
  RevenueSummaryCard,
  PendingRequestsCard,
  QuickActionsCard,
  StudentManagementCard,
  PendingAttendanceRequestsCard,
  StudentFeesSummaryCard,
  BulkAttendanceCard
} from '@/components/teacher-dashboard/index';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Don't render if user is not available
  if (!user) {
    return null;
  }
  
  const { students } = useStudents();
  const { showBulkAttendance, setShowBulkAttendance, setBulkStartDate, setBulkEndDate } = useBulkAttendance(user?.uid, students);

  const providerData = user?.providerData || [];
  const isGoogleLinked = providerData.some((provider: any) => provider.providerId === 'google.com');

  // Refresh function to trigger re-renders of all dashboard cards
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Auto-refresh when data changes
  useEffect(() => {
    const events = [
      'attendance-updated',
      'student-updated', 
      'fee-updated',
      'payment-updated',
      'account-updated'
    ];

    const handleDataUpdate = () => {
      handleRefresh();
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleDataUpdate);
    });

    // Cleanup event listeners
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleDataUpdate);
      });
    };
  }, [handleRefresh]);

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex flex-col">
      <Navigation showRecalculate={true} onRefresh={handleRefresh} />
      <main className="flex-grow container mx-auto px-6 py-8">
        <AccountSettingsCard show={true} userRole={user.role} isGoogleLinked={isGoogleLinked} />
        <InitialSetupCard />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MonthlyFeeSettingsCard key={`monthly-${refreshKey}`} />
          <RevenueSummaryCard key={`revenue-${refreshKey}`} />
                </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <PendingRequestsCard key={`pending-${refreshKey}`} />
          <QuickActionsCard key={`quick-${refreshKey}`} showBulkAttendance={showBulkAttendance} setShowBulkAttendance={setShowBulkAttendance} setBulkStartDate={setBulkStartDate} setBulkEndDate={setBulkEndDate} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <StudentManagementCard key={`student-mgmt-${refreshKey}`} />
          <PendingAttendanceRequestsCard key={`attendance-requests-${refreshKey}`} />
                </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
          <StudentFeesSummaryCard key={`fees-summary-${refreshKey}`} />
        </div>
        <BulkAttendanceCard showBulkAttendance={showBulkAttendance} setShowBulkAttendance={setShowBulkAttendance} />
        
      </main>
      <Footer />
    </div>
  );
}