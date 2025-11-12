import { useAuth, useAdminAnalytics } from '@/hooks';
import { Navigation, Footer } from '@/components';
import { MonthlyRevenueChart, StudentAttendanceChart } from '@/components/admin-dashboard';
import { useState } from 'react';
import { debouncedToast, backfillPlatformMonthlyRevenue } from '@/lib';
import logger from '@/lib/logger';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { monthlyRevenue, monthlyAttendance, trackedStudents, loading } = useAdminAnalytics(refreshKey);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-palette-light-cream">
      <Navigation 
        onRefresh={async () => {
          try {
            setRefreshing(true);
            await backfillPlatformMonthlyRevenue();
            setRefreshKey((k) => k + 1);
            debouncedToast('Revenue recalculated and refreshed', 'success');
          } catch (error) {
            logger.error('Error refreshing revenue:', error);
            debouncedToast('Failed to refresh revenue', 'error');
          } finally {
            setRefreshing(false);
          }
        }}
        refreshing={refreshing}
      />
      
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4">

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-palette-dark-red">Admin Dashboard</h1>
          </div>

          <div className="w-full">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyRevenueChart data={monthlyRevenue} loading={loading} />
                <StudentAttendanceChart data={monthlyAttendance} loading={loading} trackedStudents={trackedStudents} />
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}