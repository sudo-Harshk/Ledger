import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, query, orderBy, where, limit, onSnapshot } from 'firebase/firestore';
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
    // Keep unsubscribe functions to clean up real-time listeners on refresh
    let unsubscribePlatformMonthly: (() => void) | null = null;
    let unsubscribeAttendanceFallback: (() => void) | null = null;
    let unsubscribeCurrentMonthLive: (() => void) | null = null;

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

        // Try platformMonthlyAttendance first (pre-aggregated monthly counts) with live updates
        const platformMonthlyRef = query(collection(db, 'platformMonthlyAttendance'), orderBy('month', 'asc'));
        const platformMonthlyOnce = await getDocs(platformMonthlyRef);
        if (!platformMonthlyOnce.empty) {
          // Seed current values immediately
          const seed: MonthlyAttendanceData[] = [];
          platformMonthlyOnce.forEach((docSnap) => {
            const data = docSnap.data() as { month?: string; presentDays?: number };
            const monthKey = data.month || docSnap.id; // expect YYYY-MM
            if (monthKey) {
              seed.push({
                month: /\d{4}-\d{2}/.test(monthKey) ? `${monthKey}-01` : monthKey,
                attendance: data.presentDays || 0,
                totalStudents: 0
              });
            }
          });
          seed.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
          setMonthlyAttendance(seed);

          // Start live listener
          unsubscribePlatformMonthly = onSnapshot(platformMonthlyRef, (snap) => {
            const live: MonthlyAttendanceData[] = [];
            snap.forEach((docSnap) => {
              const data = docSnap.data() as { month?: string; presentDays?: number };
              const monthKey = data.month || docSnap.id;
              if (monthKey) {
                live.push({
                  month: /\d{4}-\d{2}/.test(monthKey) ? `${monthKey}-01` : monthKey,
                  attendance: data.presentDays || 0,
                  totalStudents: 0,
                });
              }
            });
            live.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
            setMonthlyAttendance(live);
          });

          // Additionally, ensure the current month is always live and exact from attendance
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const currentMonthKey = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          const currentMonthId = `${currentMonthKey}-01`;
          const currentMonthQuery = query(
            collection(db, 'attendance'),
            where('status', '==', 'approved'),
            where('date', '>=', toIso(startOfMonth)),
            where('date', '<=', toIso(endOfMonth))
          );
          unsubscribeCurrentMonthLive = onSnapshot(currentMonthQuery, (snap) => {
            const approvedCount = snap.size;
            setMonthlyAttendance((prev) => {
              // If prev hasn't been set yet, initialize with one entry for current month
              if (!prev || prev.length === 0) {
                return [{ month: currentMonthId, attendance: approvedCount, totalStudents: 0 }];
              }
              let found = false;
              const updated = prev.map((item) => {
                if (item.month === currentMonthId) {
                  found = true;
                  return { ...item, attendance: approvedCount };
                }
                return item;
              });
              if (!found) {
                // Insert maintaining sort order
                const withCurrent = [...updated, { month: currentMonthId, attendance: approvedCount, totalStudents: 0 }];
                withCurrent.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
                return withCurrent;
              }
              return updated;
            });
          });
        } else {
          // Compute on the fly from attendance records
          // Only include approved records to match student dashboard's approved days
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('status', '==', 'approved'),
            where('date', '>=', startFromAugustStr),
            orderBy('date', 'desc')
          );
          let attendanceSnapshot = await getDocs(attendanceQuery);

          // Fallback: if no docs since this August, try since last August
          if (attendanceSnapshot.empty) {
            const prevAugQuery = query(
              collection(db, 'attendance'),
              where('status', '==', 'approved'),
              where('date', '>=', startFromLastAugustStr),
              orderBy('date', 'desc')
            );
            attendanceSnapshot = await getDocs(prevAugQuery);
          }

          // Fallback 2: still empty, fetch recent records regardless of date (client-side aggregate)
          if (attendanceSnapshot.empty) {
            const recentQuery = query(
              collection(db, 'attendance'),
              where('status', '==', 'approved'),
              orderBy('date', 'desc'),
              limit(500)
            );
            attendanceSnapshot = await getDocs(recentQuery);
          }
        
          const buildFromSnapshot = (snapshot: typeof attendanceSnapshot) => {
            const attendanceByMonth: { [key: string]: { count: number } } = {};
            snapshot.forEach((doc) => {
              const data = doc.data() as { date?: string };
              if (typeof data.date === 'string') {
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
            const attendanceData: MonthlyAttendanceData[] = Object.entries(attendanceByMonth)
              .map(([month, agg]) => ({ month, attendance: agg.count, totalStudents: 0 }))
              .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
            return attendanceData;
          };

          // Seed from current snapshot
          setMonthlyAttendance(buildFromSnapshot(attendanceSnapshot));

          // Start live listener for approved attendance
          unsubscribeAttendanceFallback = onSnapshot(attendanceQuery, (snap) => {
            setMonthlyAttendance(buildFromSnapshot(snap));
          });
        }

      } catch (error) {
        console.error('Error fetching admin analytics:', error);
        debouncedToast('Failed to load analytics data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    return () => {
      if (unsubscribePlatformMonthly) unsubscribePlatformMonthly();
      if (unsubscribeAttendanceFallback) unsubscribeAttendanceFallback();
      if (unsubscribeCurrentMonthLive) unsubscribeCurrentMonthLive();
    };
  }, [refreshKey]);

  return {
    monthlyRevenue,
    monthlyAttendance,
    loading
  };
}
