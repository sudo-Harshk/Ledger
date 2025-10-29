import { collectionGroup, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast } from './debouncedToast';

// Aggregates revenue from users/*/monthlySummaries/* into platformMonthlyRevenue/{YYYY-MM}
export async function backfillPlatformMonthlyRevenue() {
  try {
    const snap = await getDocs(collectionGroup(db, 'monthlySummaries'));
    const totals: Record<string, number> = {};
    snap.forEach((d) => {
      const monthId = d.id; // expected YYYY-MM
      const data = d.data() as { revenue?: number };
      if (/^\d{4}-\d{2}$/.test(monthId)) {
        totals[monthId] = (totals[monthId] || 0) + (data.revenue || 0);
      }
    });

    const writes = Object.entries(totals).map(([month, revenue]) =>
      setDoc(doc(db, 'platformMonthlyRevenue', month), {
        month,
        revenue,
        lastComputedAt: serverTimestamp(),
      }, { merge: true })
    );

    await Promise.all(writes);
    debouncedToast('Monthly revenue backfilled', 'success');
    return totals;
  } catch (e) {
    console.error('Backfill revenue error', e);
    debouncedToast('Backfill revenue failed', 'error');
    throw e;
  }
}


