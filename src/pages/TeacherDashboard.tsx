import { useAuth, useBulkAttendance, useStudents, useCalendar } from '@/hooks';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  if (!user) {
    return null;
  }
  
  const { students } = useStudents();
  const activeStudents = useMemo(() => 
    students.filter(student => student.isActive !== false),
    [students]
  );
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
    handleCalendarDayClick
  } = useBulkAttendance(user?.uid, activeStudents, currentMonth, refreshKey, isInitialLoad);

  const providerData = user?.providerData || [];
  const isGoogleLinked = providerData.some((provider) => provider.providerId === 'google.com');
  const isGitHubLinked = providerData.some((provider) => provider.providerId === 'github.com');

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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

    events.forEach(event => {
      window.addEventListener(event, handleDataUpdate);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleDataUpdate);
      });
    };
  }, [handleRefresh]);

  return (
    <div className="min-h-screen bg-palette-light-cream flex flex-col">
      <Navigation showRecalculate={true} onRefresh={handleRefresh} refreshing={isRefreshing} />
      <main className="flex-grow container mx-auto px-6 py-8">
        <AccountSettingsCard 
          show={true} 
          isGoogleLinked={isGoogleLinked}
          isGitHubLinked={isGitHubLinked}
        />
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
          <StudentFeesSummaryCard key={`fees-summary-${refreshKey}`} currentMonth={currentMonth} refreshKey={refreshKey} />
        </div>
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
          students={activeStudents}
          currentMonth={currentMonth}
          daysInMonth={daysInMonth}
          changeMonth={changeMonth}
        />
        
      </main>
      <Footer />
    </div>
  );
}