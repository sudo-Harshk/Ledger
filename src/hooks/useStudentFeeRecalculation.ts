import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate, dispatchFeeUpdatedEvent } from '@/lib';
import toast from 'react-hot-toast';

interface RecalculationOptions {
  studentIds?: string[]; // Specific students, or empty for all
  month: Date;
  batchSize?: number;
  showToast?: boolean; // Whether to show success toast
}

export const useStudentFeeRecalculation = () => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Get month key for database storage
  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Recalculate fees for specific students or all students
  const recalculateStudentFees = useCallback(async ({ 
    studentIds, 
    month, 
    batchSize = 10,
    showToast = true
  }: RecalculationOptions) => {
    setIsRecalculating(true);
    const loadingToast = toast.loading('Recalculating student fees...');

    try {
      const monthKey = getMonthKey(month);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const totalDaysInMonth = monthEnd.getDate();

      // Get students to update
      let studentsQuery;
      if (studentIds && studentIds.length > 0) {
        // Specific students - batch them due to Firestore 'in' limitation
        const studentBatches = [];
        for (let i = 0; i < studentIds.length; i += 10) {
          const batchIds = studentIds.slice(i, i + 10);
          const batchQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('__name__', 'in', batchIds)
          );
          studentBatches.push(batchQuery);
        }
        
        const allStudents = [];
        for (const batchQuery of studentBatches) {
          const snapshot = await getDocs(batchQuery);
          allStudents.push(...snapshot.docs);
        }
        var studentDocs = allStudents;
      } else {
        // All students
        studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        var studentDocs = studentsSnapshot.docs;
      }

      setProgress({ current: 0, total: studentDocs.length });

      // Process students in batches to avoid overwhelming Firestore
      const batches = [];
      for (let i = 0; i < studentDocs.length; i += batchSize) {
        batches.push(studentDocs.slice(i, i + batchSize));
      }

      let processedCount = 0;

      for (const batch of batches) {
        const batchPromises = batch.map(async (studentDoc) => {
          const studentData = studentDoc.data();
          const studentId = studentDoc.id;
          const monthlyFee = studentData.monthlyFee || 0;

          // Get approved attendance for this month
          const approvedQuery = query(
            collection(db, 'attendance'),
            where('studentId', '==', studentId),
            where('status', '==', 'approved'),
            where('date', '>=', formatLocalDate(monthStart)),
            where('date', '<=', formatLocalDate(monthEnd))
          );

          const approvedSnapshot = await getDocs(approvedQuery);
          const approvedDays = approvedSnapshot.size;

          // Calculate total amount due
          const dailyRate = monthlyFee > 0 ? monthlyFee / totalDaysInMonth : 0;
          const totalAmount = Math.round(approvedDays * dailyRate * 100) / 100;

          // Get existing due data to preserve payment status
          const existingDue = studentData.totalDueByMonth?.[monthKey] || {};
          const currentStatus = existingDue.status || 'unpaid';
          const paymentDate = existingDue.paymentDate || null;
          const amountPaid = existingDue.amountPaid || 0;

          // Update student's fee record
          const userRef = doc(db, 'users', studentId);
          await updateDoc(userRef, {
            [`totalDueByMonth.${monthKey}`]: {
              due: totalAmount,
              approvedDays: approvedDays,
              dailyRate: dailyRate,
              status: currentStatus,
              paymentDate: paymentDate,
              amountPaid: amountPaid,
              lastCalculated: new Date(),
              calculatedFor: monthKey
            },
            lastTotalDueUpdate: new Date()
          });

          return { studentId, totalAmount, approvedDays };
        });

        // Wait for current batch to complete
        await Promise.all(batchPromises);
        processedCount += batch.length;
        setProgress({ current: processedCount, total: studentDocs.length });
      }

      toast.dismiss(loadingToast);
      if (showToast) {
        toast.success(`Recalculated fees for ${studentDocs.length} students for ${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      }

      // Dispatch event to refresh dashboard
      dispatchFeeUpdatedEvent();

      return {
        success: true,
        studentsProcessed: studentDocs.length,
        monthKey
      };

    } catch (error: any) {
      console.error('Error recalculating student fees:', error);
      toast.dismiss(loadingToast);
      toast.error(`Failed to recalculate fees: ${error?.message || 'Unknown error'}`);
      return {
        success: false,
        error: error?.message || 'Unknown error'
      };
    } finally {
      setIsRecalculating(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  // Recalculate fees for a single student (useful after attendance approval)
  const recalculateSingleStudent = useCallback(async (studentId: string, month: Date, showToast = true) => {
    return await recalculateStudentFees({ 
      studentIds: [studentId], 
      month,
      showToast
    });
  }, [recalculateStudentFees]);

  // Recalculate fees for all students
  const recalculateAllStudents = useCallback(async (month: Date) => {
    return await recalculateStudentFees({ month });
  }, [recalculateStudentFees]);

  return {
    isRecalculating,
    progress,
    recalculateStudentFees,
    recalculateSingleStudent,
    recalculateAllStudents
  };
};
