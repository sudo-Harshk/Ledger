import { setDoc, doc, serverTimestamp, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast } from './debouncedToast';

// Calculates total revenue from all paid student fees for a month
async function calculateMonthlyRevenue(monthKey: string): Promise<number> {
  const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
  const studentsSnap = await getDocs(studentsQuery);
  
  let totalRevenue = 0;
  
  studentsSnap.forEach((studentDoc) => {
    const studentData = studentDoc.data();
    const totalDueByMonth = studentData.totalDueByMonth || {};
    const monthData = totalDueByMonth[monthKey];
    
    // Check if this month has paid data
    if (typeof monthData === 'object' && monthData !== null) {
      if (monthData.status === 'paid' && monthData.amountPaid) {
        totalRevenue += monthData.amountPaid;
      }
    }
  });
  
  return totalRevenue;
}

// Updates all teachers' monthlySummaries with the provided revenue
export async function updateTeacherMonthlySummaries(monthKey: string, totalRevenue: number) {
  try {
    // Get all teachers
    const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const teachersSnap = await getDocs(teachersQuery);
    
    // Update each teacher's monthlySummaries
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
    console.error('Update teacher monthly summaries error', e);
    throw e;
  }
}

// Updates platformMonthlyRevenue for a specific month
export async function updatePlatformMonthlyRevenue(monthKey: string) {
  try {
    // Calculate total revenue from all paid student fees
    const totalRevenue = await calculateMonthlyRevenue(monthKey);

    // Update the platformMonthlyRevenue document
    await setDoc(doc(db, 'platformMonthlyRevenue', monthKey), {
      month: monthKey,
      revenue: totalRevenue,
      lastComputedAt: serverTimestamp(),
    }, { merge: true });

    // Also update all teachers' monthlySummaries
    await updateTeacherMonthlySummaries(monthKey, totalRevenue);

    return totalRevenue;
  } catch (e) {
    console.error('Update platform monthly revenue error', e);
    throw e;
  }
}

// Aggregates paid student fees into platformMonthlyRevenue/{YYYY-MM}
export async function backfillPlatformMonthlyRevenue() {
  try {
    // Get all students with their totalDueByMonth data
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnap = await getDocs(studentsQuery);
    
    const totals: Record<string, number> = {};
    
    studentsSnap.forEach((studentDoc) => {
      const studentData = studentDoc.data();
      const totalDueByMonth = studentData.totalDueByMonth || {};
      
      // Process each month's data
      Object.keys(totalDueByMonth).forEach((monthKey) => {
        const monthData = totalDueByMonth[monthKey];
        
        // Check if this month has paid data
        if (typeof monthData === 'object' && monthData !== null) {
          if (monthData.status === 'paid' && monthData.amountPaid) {
            if (/^\d{4}-\d{2}$/.test(monthKey)) {
              totals[monthKey] = (totals[monthKey] || 0) + monthData.amountPaid;
            }
          }
        }
      });
    });

    // Update platformMonthlyRevenue for all months
    const platformWrites = Object.entries(totals).map(([month, revenue]) =>
      setDoc(doc(db, 'platformMonthlyRevenue', month), {
        month,
        revenue,
        lastComputedAt: serverTimestamp(),
      }, { merge: true })
    );

    await Promise.all(platformWrites);

    // Update all teachers' monthlySummaries for each month
    const teacherUpdatePromises = Object.entries(totals).map(([month, revenue]) =>
      updateTeacherMonthlySummaries(month, revenue)
    );

    await Promise.all(teacherUpdatePromises);
    
    debouncedToast('Monthly revenue backfilled', 'success');
    return totals;
  } catch (e) {
    console.error('Backfill revenue error', e);
    debouncedToast('Backfill revenue failed', 'error');
    throw e;
  }
}


