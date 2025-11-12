import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate, dispatchFeeUpdatedEvent } from '@/lib';
import toast from 'react-hot-toast';
import logger from '@/lib/logger';

interface RecalculationOptions {
  studentIds?: string[];
  month: Date;
  batchSize?: number;
  showToast?: boolean;
}

export const useStudentFeeRecalculation = () => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

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

      let studentsQuery;
      if (studentIds && studentIds.length > 0) {
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
        var studentDocs = allStudents.filter(doc => {
          const studentData = doc.data();
          return studentData.isActive !== false;
        });
        
        if (studentDocs.length < allStudents.length) {
          const filteredCount = allStudents.length - studentDocs.length;
          logger.warn(`Filtered out ${filteredCount} inactive student(s) from fee recalculation`);
        }
      } else {
        studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        var studentDocs = studentsSnapshot.docs.filter(doc => {
          const studentData = doc.data();
          return studentData.isActive !== false;
        });
      }

      setProgress({ current: 0, total: studentDocs.length });

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

          const approvedQuery = query(
            collection(db, 'attendance'),
            where('studentId', '==', studentId),
            where('status', '==', 'approved'),
            where('date', '>=', formatLocalDate(monthStart)),
            where('date', '<=', formatLocalDate(monthEnd))
          );

          const approvedSnapshot = await getDocs(approvedQuery);
          const approvedDays = approvedSnapshot.size;

          const dailyRate = monthlyFee > 0 ? monthlyFee / totalDaysInMonth : 0;
          const totalAmount = Math.round(approvedDays * dailyRate * 100) / 100;

          const existingDue = studentData.totalDueByMonth?.[monthKey] || {};
          const currentStatus = existingDue.status || 'unpaid';
          const paymentDate = existingDue.paymentDate || null;
          const amountPaid = existingDue.amountPaid || 0;

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

        await Promise.all(batchPromises);
        processedCount += batch.length;
        setProgress({ current: processedCount, total: studentDocs.length });
      }

      toast.dismiss(loadingToast);
      if (showToast) {
        toast.success(`Recalculated fees for ${studentDocs.length} students for ${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
      }

      dispatchFeeUpdatedEvent();

      return {
        success: true,
        studentsProcessed: studentDocs.length,
        monthKey
      };

    } catch (error: unknown) {
      logger.error('Error recalculating student fees:', error);
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to recalculate fees: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsRecalculating(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  const recalculateSingleStudent = useCallback(async (studentId: string, month: Date, showToast = true) => {
    return await recalculateStudentFees({ 
      studentIds: [studentId], 
      month,
      showToast
    });
  }, [recalculateStudentFees]);

  const recalculateAllStudents = useCallback(async (month: Date, showToast = true) => {
    return await recalculateStudentFees({ month, showToast });
  }, [recalculateStudentFees]);

  return {
    isRecalculating,
    progress,
    recalculateStudentFees,
    recalculateSingleStudent,
    recalculateAllStudents
  };
};
