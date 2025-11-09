import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, query, orderBy, where, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks';
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

interface TrackedStudent {
  id: string;
  name: string;
}

export function useAdminAnalytics(refreshKey?: number) {
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueData[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendanceData[]>([]);
  const [trackedStudents, setTrackedStudents] = useState<TrackedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // If not signed in yet, don't attach listeners
      setMonthlyRevenue([]);
      setMonthlyAttendance([]);
      setTrackedStudents([]);
      setLoading(true);
      return;
    }
    // Keep unsubscribe functions to clean up real-time listeners on refresh    
    let unsubscribePlatformMonthly: (() => void) | null = null;
    let unsubscribeAttendanceFallback: (() => void) | null = null;
    let unsubscribeCurrentMonthLive: (() => void) | null = null;
    let unsubscribeRevenue: (() => void) | null = null;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Determine start date: August 1st of the current year
        const now = new Date();
        const startFromAugust = new Date(now.getFullYear(), 7, 1);
        const startFromLastAugust = new Date(now.getFullYear() - 1, 7, 1);      

        // Live revenue from platformMonthlyRevenue (pre-aggregated)
        const revenueQuery = query(collection(db, 'platformMonthlyRevenue'), orderBy('month', 'asc'));                                                          
        unsubscribeRevenue = onSnapshot(revenueQuery, (snap) => {
          const revenueData: MonthlyRevenueData[] = snap.docs
            .map((d) => {
              const data = d.data() as { month?: string; revenue?: number };    
              const monthKey = (data.month || d.id || '').toString(); // expected YYYY-MM                                                                       
              const iso = /\d{4}-\d{1,2}/.test(monthKey) ? `${monthKey}-01` : monthKey;                                                                          
              return { monthIso: iso, revenue: data.revenue || 0 } as { monthIso: string; revenue: number };                                                    
            })
            .filter((r) => {
              const parsed = new Date(r.monthIso);
              return !isNaN(parsed.getTime()) && parsed >= startFromAugust;     
            })
            .map((r) => ({ month: r.monthIso, revenue: r.revenue }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());                                                                         
          setMonthlyRevenue(revenueData);
        }, (error) => {
          // Silently handle permission errors (e.g., when user logs out)
          if (error.code === 'permission-denied') {
            return;
          }
          console.error('Error in revenue listener:', error);
        });

        // Always seed from collectionGroup as immediate fallback (runs in parallel with listener)                                                              
        (async () => {
          try {
            const cgSnap = await getDocs(collectionGroup(db, 'monthlySummaries'));                                                                              
            const totals: Record<string, number> = {};
            cgSnap.forEach((d) => {
              const data = d.data() as { revenue?: number };
              const monthId = d.id; // expected YYYY-MM
              if (/^\d{4}-\d{1,2}$/.test(monthId)) {
                const iso = `${monthId}-01`;
                const parsed = new Date(iso);
                if (!isNaN(parsed.getTime()) && parsed >= startFromAugust) {    
                  totals[monthId] = (totals[monthId] || 0) + (data.revenue || 0);                                                                               
                }
              }
            });
            const seeded = Object.entries(totals)
              .map(([m, rev]) => ({ month: `${m}-01`, revenue: rev }))
              .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());                                                                       
            if (seeded.length > 0) {
              // Always update - this ensures we show data from monthlySummaries even if platformMonthlyRevenue is empty                                        
              setMonthlyRevenue((prev) => {
                // If prev is empty or has no data, use seeded; otherwise merge 
                if (!prev || prev.length === 0) return seeded;
                const prevMonths = new Set(prev.map((p) => p.month));
                const merged = [...prev, ...seeded.filter((s) => !prevMonths.has(s.month))];                                                                    
                merged.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());                                                               
                return merged;
              });
            }
          } catch (e) {
            console.error('Fallback revenue aggregation error:', e);
            // ignore fallback errors; primary is the real-time aggregate       
          }
        })();

        // Fetch attendance data from August onward (server-side filter when possible)                                                                          
        const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;               
        const startFromAugustStr = toIsoDate(startFromAugust);
        const startFromLastAugustStr = toIsoDate(startFromLastAugust);

        // Fetch and track which students have attendance records
        const fetchTrackedStudents = async () => {
          try {
            // Get all students
            const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
            const studentsSnapshot = await getDocs(studentsQuery);
            
            // Get all unique student IDs from attendance records
            const attendanceQuery = query(
              collection(db, 'attendance'),
              where('status', '==', 'approved')
            );
            const attendanceSnapshot = await getDocs(attendanceQuery);
            
            const studentIdsWithAttendance = new Set<string>();
            attendanceSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.studentId) {
                studentIdsWithAttendance.add(data.studentId);
              }
            });

            // Match student IDs with their names
            const students: TrackedStudent[] = [];
            studentsSnapshot.forEach((doc) => {
              const studentData = doc.data();
              if (studentIdsWithAttendance.has(doc.id)) {
                students.push({
                  id: doc.id,
                  name: studentData.displayName || studentData.username || studentData.email || 'Unknown Student'
                });
              }
            });

            // Sort by name for consistent display
            students.sort((a, b) => a.name.localeCompare(b.name));
            setTrackedStudents(students);
          } catch (error) {
            console.error('Error fetching tracked students:', error);
            // Don't fail the entire analytics fetch if this fails
          }
        };

        // Fetch tracked students
        fetchTrackedStudents();

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
          }, (error) => {
            // Silently handle permission errors (e.g., when user logs out)
            if (error.code === 'permission-denied') {
              return;
            }
            console.error('Error in platform monthly attendance listener:', error);
          });

          // Additionally, ensure the current month is always live and exact from attendance                                                                    
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);  
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const currentMonthId = toIsoDate(startOfMonth);
          const currentMonthQuery = query(
            collection(db, 'attendance'),
            where('status', '==', 'approved'),
            where('date', '>=', toIsoDate(startOfMonth)),
            where('date', '<=', toIsoDate(endOfMonth))
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
          }, (error) => {
            // Silently handle permission errors (e.g., when user logs out)
            if (error.code === 'permission-denied') {
              return;
            }
            console.error('Error in current month attendance listener:', error);
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
          }, (error) => {
            // Silently handle permission errors (e.g., when user logs out)
            if (error.code === 'permission-denied') {
              return;
            }
            console.error('Error in attendance fallback listener:', error);
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
      if (unsubscribeRevenue) unsubscribeRevenue();
    };
  }, [refreshKey, user?.uid]);

  return {
    monthlyRevenue,
    monthlyAttendance,
    trackedStudents,
    loading
  };
}
