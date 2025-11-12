import { setDoc, doc, serverTimestamp, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast } from './debouncedToast';
import logger from './logger';

async function calculateMonthlyRevenue(monthKey: string): Promise<number> {
  const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
  const studentsSnap = await getDocs(studentsQuery);
  
  let totalRevenue = 0;
  
  studentsSnap.forEach((studentDoc) => {
    const studentData = studentDoc.data();
    const totalDueByMonth = studentData.totalDueByMonth || {};
    const monthData = totalDueByMonth[monthKey];
    
    if (typeof monthData === 'object' && monthData !== null) {
      if (monthData.status === 'paid' && monthData.amountPaid) {
        totalRevenue += monthData.amountPaid;
      }
    }
  });
  
  return totalRevenue;
}

export async function updateTeacherMonthlySummaries(monthKey: string, totalRevenue: number) {
  try {
    const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const teachersSnap = await getDocs(teachersQuery);
    
    const updatePromises = teachersSnap.docs.map((teacherDoc) => {
      const teacherId = teacherDoc.id;
      const summaryDocRef = doc(db, 'users', teacherId, 'monthlySummaries', monthKey);
      
      return setDoc(summaryDocRef, {
        revenue: totalRevenue,
        lastUpdated: Timestamp.now(),
      }, { merge: true });
    });
    
    await Promise.all(updatePromises);
    return totalRevenue;
  } catch (e) {
    logger.error('Update teacher monthly summaries error', e);
    throw e;
  }
}

export async function updatePlatformMonthlyRevenue(monthKey: string) {
  try {
    const totalRevenue = await calculateMonthlyRevenue(monthKey);

    await setDoc(doc(db, 'platformMonthlyRevenue', monthKey), {
      month: monthKey,
      revenue: totalRevenue,
      lastComputedAt: serverTimestamp(),
    }, { merge: true });

    await updateTeacherMonthlySummaries(monthKey, totalRevenue);

    return totalRevenue;
  } catch (e) {
    logger.error('Update platform monthly revenue error', e);
    throw e;
  }
}

export async function backfillPlatformMonthlyRevenue() {
  try {
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnap = await getDocs(studentsQuery);
    
    const totals: Record<string, number> = {};
    
    studentsSnap.forEach((studentDoc) => {
      const studentData = studentDoc.data();
      const totalDueByMonth = studentData.totalDueByMonth || {};
      
      Object.keys(totalDueByMonth).forEach((monthKey) => {
        const monthData = totalDueByMonth[monthKey];
        
        if (typeof monthData === 'object' && monthData !== null) {
          if (monthData.status === 'paid' && monthData.amountPaid) {
            if (/^\d{4}-\d{2}$/.test(monthKey)) {
              totals[monthKey] = (totals[monthKey] || 0) + monthData.amountPaid;
            }
          }
        }
      });
    });

    const platformWrites = Object.entries(totals).map(([month, revenue]) =>
      setDoc(doc(db, 'platformMonthlyRevenue', month), {
        month,
        revenue,
        lastComputedAt: serverTimestamp(),
      }, { merge: true })
    );

    await Promise.all(platformWrites);

    const teacherUpdatePromises = Object.entries(totals).map(([month, revenue]) =>
      updateTeacherMonthlySummaries(month, revenue)
    );

    await Promise.all(teacherUpdatePromises);
    
    debouncedToast('Monthly revenue backfilled', 'success');
    return totals;
  } catch (e) {
    logger.error('Backfill revenue error', e);
    debouncedToast('Backfill revenue failed', 'error');
    throw e;
  }
}


