import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { debouncedToast } from '../lib/debouncedToast';

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

interface MonthlyAttendanceData {
  month: string;
  attendance: number; // now represents count of records in the month
  totalStudents: number; // unused for now
}

export function useAdminAnalytics(refreshKey?: number) {
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueData[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Determine start date: August 1st of the current year
        const now = new Date();
        const startFromAugust = new Date(now.getFullYear(), 7, 1);
        const startFromLastAugust = new Date(now.getFullYear() - 1, 7, 1);

        // Aggregate revenue across teachers from users/*/monthlySummaries/* using a collection group query
        const summariesSnap = await getDocs(collectionGroup(db, 'monthlySummaries'));
        const revenueByMonth: Record<string, number> = {};
        summariesSnap.forEach((docSnap) => {
          const data = docSnap.data() as { revenue?: number };
          // doc id is expected to be YYYY-MM
          const monthId = docSnap.id;
          const parsed = new Date(`${monthId}-01`);
          if (!isNaN(parsed.getTime())) {
            if (parsed >= startFromAugust) {
              revenueByMonth[monthId] = (revenueByMonth[monthId] || 0) + (data.revenue || 0);
            }
          }
        });

        const revenueData: MonthlyRevenueData[] = Object.entries(revenueByMonth)
          .map(([month, revenue]) => ({ month: `${month}-01`, revenue }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setMonthlyRevenue(revenueData);

        // Fetch attendance data from August onward (server-side filter when possible)
        const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const startFromAugustStr = toIsoDate(startFromAugust);
        const startFromLastAugustStr = toIsoDate(startFromLastAugust);

        // Try platformMonthlyAttendance first (pre-aggregated monthly counts)
        const monthlyCountsSnap = await getDocs(query(collection(db, 'platformMonthlyAttendance'), orderBy('month', 'asc')));
        if (!monthlyCountsSnap.empty) {
          const monthlyCounts: MonthlyAttendanceData[] = [];
          monthlyCountsSnap.forEach((docSnap) => {
            const data = docSnap.data() as { month?: string; presentDays?: number };
            const monthKey = data.month || docSnap.id; // expect YYYY-MM
            if (monthKey) {
              monthlyCounts.push({
                month: /\d{4}-\d{2}/.test(monthKey) ? `${monthKey}-01` : monthKey,
                attendance: data.presentDays || 0,
                totalStudents: 0
              });
            }
          });
          monthlyCounts.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
          setMonthlyAttendance(monthlyCounts);
        } else {
          // Compute on the fly from attendance records
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('date', '>=', startFromAugustStr),
            orderBy('date', 'desc')
          );
          let attendanceSnapshot = await getDocs(attendanceQuery);

          // Fallback: if no docs since this August, try since last August
          if (attendanceSnapshot.empty) {
            const prevAugQuery = query(
              collection(db, 'attendance'),
              where('date', '>=', startFromLastAugustStr),
              orderBy('date', 'desc')
            );
            attendanceSnapshot = await getDocs(prevAugQuery);
          }

          // Fallback 2: still empty, fetch recent records regardless of date (client-side aggregate)
          if (attendanceSnapshot.empty) {
            const recentQuery = query(
              collection(db, 'attendance'),
              orderBy('date', 'desc'),
              limit(500)
            );
            attendanceSnapshot = await getDocs(recentQuery);
          }
        
        // Group attendance by month
        const attendanceByMonth: { [key: string]: { count: number } } = {};
        
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data() as { date?: string };
          if (typeof data.date === 'string') {
            // date is stored as ISO string YYYY-MM-DD
            const [yearStr, monthStr] = data.date.split('-');
            if (yearStr && monthStr) {
              const monthKey = `${yearStr}-${monthStr}`;
              if (!attendanceByMonth[monthKey]) {
                attendanceByMonth[monthKey] = { count: 0 };
              }
              attendanceByMonth[monthKey].count += 1;
            }
          }
        });

        // Convert to chart data format
        const attendanceData: MonthlyAttendanceData[] = Object.entries(attendanceByMonth)
          .map(([month, agg]) => ({
            month,
            attendance: agg.count,
            totalStudents: 0
          }))
          .sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
          });

        setMonthlyAttendance(attendanceData); // From August onward or fallback
        }

      } catch (error) {
        console.error('Error fetching admin analytics:', error);
        debouncedToast('Failed to load analytics data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [refreshKey]);

  return {
    monthlyRevenue,
    monthlyAttendance,
    loading
  };
}
