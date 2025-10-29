import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { debouncedToast } from '../../lib/debouncedToast';

interface PlatformAnalyticsCardProps {
  refreshKey: number;
}

interface AnalyticsData {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalRevenue: number;
  activeUsers: number;
  monthlyGrowth: number;
  avgRevenuePerStudent: number;
}

export default function PlatformAnalyticsCard({ refreshKey }: PlatformAnalyticsCardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalRevenue: 0,
    activeUsers: 0,
    monthlyGrowth: 0,
    avgRevenuePerStudent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch all users
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const usersSnapshot = await getDocs(usersQuery);
        
        let totalUsers = 0;
        let totalTeachers = 0;
        let totalStudents = 0;
        let recentUsers = 0;
        
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          totalUsers++;
          
          // Check if user was created in the last month
          if (userData.createdAt && userData.createdAt.toDate && userData.createdAt.toDate() > oneMonthAgo) {
            recentUsers++;
          }
          
          if (userData.role === 'teacher') {
            totalTeachers++;
          } else if (userData.role === 'student') {
            totalStudents++;
          }
        });

        // Fetch revenue summaries
        const revenueQuery = query(collection(db, 'revenueSummaries'));
        const revenueSnapshot = await getDocs(revenueQuery);
        
        let totalRevenue = 0;
        revenueSnapshot.forEach((doc) => {
          const revenueData = doc.data();
          if (revenueData.totalRevenue) {
            totalRevenue += revenueData.totalRevenue;
          }
        });

        const monthlyGrowth = totalUsers > 0 ? (recentUsers / totalUsers) * 100 : 0;
        const avgRevenuePerStudent = totalStudents > 0 ? totalRevenue / totalStudents : 0;

        setAnalytics({
          totalUsers,
          totalTeachers,
          totalStudents,
          totalRevenue,
          activeUsers: totalUsers, // For now, assume all users are active
          monthlyGrowth,
          avgRevenuePerStudent
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        debouncedToast('Failed to load platform analytics', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [refreshKey]);

  if (loading) {
    return (
      <Card className="bg-card-elevated shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-palette-dark-red flex items-center gap-2">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Platform Analytics
          </CardTitle>
          <CardDescription>Loading platform statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-palette-golden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-elevated shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-palette-dark-red flex items-center gap-2">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Platform Analytics
        </CardTitle>
        <CardDescription>Real-time overview of platform statistics and performance metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-blue-800">{analytics.totalUsers}</p>
              </div>
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {analytics.monthlyGrowth.toFixed(1)}% growth this month
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Teachers</p>
                <p className="text-2xl font-bold text-green-800">{analytics.totalTeachers}</p>
              </div>
              <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600">
              Active educators
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Students</p>
                <p className="text-2xl font-bold text-purple-800">{analytics.totalStudents}</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-xs text-purple-600">
              Enrolled learners
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-orange-800">₹{analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-xs text-orange-600">
              ₹{analytics.avgRevenuePerStudent.toFixed(0)} avg per student
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-gradient-to-r from-palette-golden/10 to-palette-golden/5 rounded-xl p-6 border border-palette-golden/30">
          <h3 className="text-lg font-semibold text-palette-dark-red mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-palette-dark-red">
                {analytics.totalTeachers > 0 ? (analytics.totalStudents / analytics.totalTeachers).toFixed(1) : '0'}
              </div>
              <div className="text-sm text-palette-dark-teal">Students per Teacher</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-palette-dark-red">
                {analytics.totalUsers > 0 ? ((analytics.totalStudents / analytics.totalUsers) * 100).toFixed(1) : '0'}%
              </div>
              <div className="text-sm text-palette-dark-teal">Student Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-palette-dark-red">
                {analytics.totalRevenue > 0 ? ((analytics.totalRevenue / analytics.totalStudents) * 12).toFixed(0) : '0'}
              </div>
              <div className="text-sm text-palette-dark-teal">Annual Revenue Potential</div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="pt-4 border-t border-palette-golden/30 flex items-center justify-between">
          <div className="text-sm text-palette-dark-teal">
            Last updated: {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live data
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
