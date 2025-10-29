import { useAuth, useAdminAnalytics } from '@/hooks';
import { Navigation, Footer } from '@/components';
import { MonthlyRevenueChart, StudentAttendanceChart } from '@/components/admin-dashboard';
import { useState } from 'react';
import { debouncedToast } from '@/lib';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { monthlyRevenue, monthlyAttendance, loading } = useAdminAnalytics(refreshKey);

  // Don't render if user is not available
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-palette-light-cream">
      {/* Navigation */}
      <Navigation 
        onRefresh={async () => {
          try {
            setRefreshing(true);
            setRefreshKey((k) => k + 1);
            debouncedToast('Refreshed analytics', 'success');
          } finally {
            setRefreshing(false);
          }
        }}
        refreshing={refreshing}
      />
      
      {/* Main Content */}
      <main className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4">

          {/* Page Title */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-palette-dark-red">Admin Dashboard</h1>
          </div>

          {/* Main Content Area */}
          <div className="w-full">
            <div className="space-y-6">
              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyRevenueChart data={monthlyRevenue} loading={loading} />
                <StudentAttendanceChart data={monthlyAttendance} loading={loading} />
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}