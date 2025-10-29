import { collection, getDocs, orderBy, query, setDoc, doc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast } from './debouncedToast';

function formatMonthKey(dateStr: string): string | null {
  // expects YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length < 2) return null;
  const [y, m] = parts;
  if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m)) return null;
  return `${y}-${m}`;
}

export async function backfillPlatformMonthlyAttendance(startFrom?: string) {
  try {
    // Optional server-side filter by date string boundary (YYYY-MM-DD)
    const base = collection(db, 'attendance');
    const q = startFrom
      ? query(base, where('date', '>=', startFrom), orderBy('date', 'asc'))
      : query(base, orderBy('date', 'asc'));
    const snap = await getDocs(q);

    const counts: Record<string, number> = {};
    snap.forEach((d) => {
      const data = d.data() as { date?: string; status?: string };
      if (typeof data.date === 'string' && data.status === 'approved') {
        const key = formatMonthKey(data.date);
        if (key) counts[key] = (counts[key] || 0) + 1;
      }
    });

    const writes = Object.entries(counts).map(([month, presentDays]) =>
      setDoc(doc(db, 'platformMonthlyAttendance', month), {
        month,
        presentDays,
        lastComputedAt: serverTimestamp(),
      }, { merge: true })
    );

    await Promise.all(writes);
    debouncedToast('Monthly attendance backfilled', 'success');
    return counts;
  } catch (e) {
    console.error('Backfill error', e);
    debouncedToast('Backfill failed', 'error');
    throw e;
  }
}


