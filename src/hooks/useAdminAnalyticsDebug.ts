import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase';

interface DebugState<T> {
  data: T[];
  error: string | null;
  loading: boolean;
}

export function useAdminAnalyticsDebug() {
  const [revenueRaw, setRevenueRaw] = useState<DebugState<Record<string, unknown>>>({ data: [], error: null, loading: true });
  const [attendanceRaw, setAttendanceRaw] = useState<DebugState<Record<string, unknown>>>({ data: [], error: null, loading: true });

  useEffect(() => {
    const run = async () => {
      try {
        setRevenueRaw((s) => ({ ...s, loading: true }));
        const revQ = query(collection(db, 'revenueSummaries'), orderBy('month', 'desc'), limit(5));
        const revSnap = await getDocs(revQ);
        const rev = revSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRevenueRaw({ data: rev, error: null, loading: false });
      } catch (e) {
        setRevenueRaw({ data: [], error: (e as Error).message, loading: false });
      }

      try {
        setAttendanceRaw((s) => ({ ...s, loading: true }));
        const attQ = query(collection(db, 'attendance'), orderBy('date', 'desc'), limit(5));
        const attSnap = await getDocs(attQ);
        const att = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAttendanceRaw({ data: att, error: null, loading: false });
      } catch (e) {
        setAttendanceRaw({ data: [], error: (e as Error).message, loading: false });
      }
    };

    run();
  }, []);

  return { revenueRaw, attendanceRaw };
}


