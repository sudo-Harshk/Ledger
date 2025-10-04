import { useAuth, useBulkAttendance, useStudents } from '@/hooks';
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

  // Don't render if user is not available
  if (!user) {
    return null;
  }
  
  const { students } = useStudents();
  const { showBulkAttendance, setShowBulkAttendance, setBulkStartDate, setBulkEndDate } = useBulkAttendance(user?.uid, students);

  const providerData = user?.providerData || [];
  const isGoogleLinked = providerData.some((provider: any) => provider.providerId === 'google.com');

  return (
    <div className="min-h-screen bg-[#FDF6F0]">
      <Navigation />
      <div className="container mx-auto px-6 py-8">
        <AccountSettingsCard show={true} userRole={user.role} isGoogleLinked={isGoogleLinked} />
        <InitialSetupCard />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MonthlyFeeSettingsCard />
          <RevenueSummaryCard />
                </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <PendingRequestsCard />
          <QuickActionsCard showBulkAttendance={showBulkAttendance} setShowBulkAttendance={setShowBulkAttendance} setBulkStartDate={setBulkStartDate} setBulkEndDate={setBulkEndDate} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <StudentManagementCard />
          <PendingAttendanceRequestsCard />
                </div>
        
        <StudentFeesSummaryCard />
        <BulkAttendanceCard showBulkAttendance={showBulkAttendance} setShowBulkAttendance={setShowBulkAttendance} />
        
        <Footer />
                      </div>
                      </div>
  );
}