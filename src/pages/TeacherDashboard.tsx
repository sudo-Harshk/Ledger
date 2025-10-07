import { useAuth, useBulkAttendance, useStudents, useCalendar } from '@/hooks';
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
import DebugBulkAttendance from '@/components/DebugBulkAttendance';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Don't render if user is not available
  if (!user) {
    return null;
  }
  
  const { students } = useStudents();
  const { currentMonth, daysInMonth, changeMonth } = useCalendar();
  const { 
    showBulkAttendance, 
    setShowBulkAttendance, 
    setBulkStartDate, 
    setBulkEndDate,
    bulkStartDate,
    bulkEndDate,
    bulkAttendanceLoading,
    defaultAttendanceStatus,
    setDefaultAttendanceStatus,
    selectedStudents,
    toggleStudentSelection,
    selectAllStudents,
    revenuePreview,
    addBulkAttendance,
    getCellClasses,
    handleCalendarDayClick,
    filteredAttendanceData
  } = useBulkAttendance(user?.uid, students, currentMonth, refreshKey);

  const providerData = user?.providerData || [];
  const isGoogleLinked = providerData.some((provider: any) => provider.providerId === 'google.com');

  // Refresh function to trigger re-renders of all dashboard cards
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Increment refresh key to force all components to re-render and re-fetch data
      setRefreshKey(prev => prev + 1);
      
      // Add a small delay to show the refreshing state
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
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
      <Navigation showRecalculate={true} onRefresh={handleRefresh} refreshing={isRefreshing} />
      <main className="flex-grow container mx-auto px-6 py-8">
        <AccountSettingsCard show={true} userRole={user.role} isGoogleLinked={isGoogleLinked} />
        <InitialSetupCard />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MonthlyFeeSettingsCard key={`monthly-${refreshKey}`} />
          <RevenueSummaryCard key={`revenue-${refreshKey}`} refreshKey={refreshKey} currentMonth={currentMonth} />
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
        <DebugBulkAttendance 
          students={students}
          selectedStudents={selectedStudents}
          filteredAttendanceData={filteredAttendanceData}
          currentMonth={currentMonth}
        />
        <BulkAttendanceCard 
          key={`bulk-attendance-${refreshKey}`}
          showBulkAttendance={showBulkAttendance} 
          setShowBulkAttendance={setShowBulkAttendance}
          bulkStartDate={bulkStartDate}
          bulkEndDate={bulkEndDate}
          setBulkStartDate={setBulkStartDate}
          setBulkEndDate={setBulkEndDate}
          bulkAttendanceLoading={bulkAttendanceLoading}
          defaultAttendanceStatus={defaultAttendanceStatus}
          setDefaultAttendanceStatus={setDefaultAttendanceStatus}
          selectedStudents={selectedStudents}
          toggleStudentSelection={toggleStudentSelection}
          selectAllStudents={selectAllStudents}
          revenuePreview={revenuePreview}
          addBulkAttendance={addBulkAttendance}
          getCellClasses={getCellClasses}
          handleCalendarDayClick={handleCalendarDayClick}
          students={students}
          currentMonth={currentMonth}
          daysInMonth={daysInMonth}
          changeMonth={changeMonth}
        />
        
      </main>
      <Footer />
    </div>
  );
}