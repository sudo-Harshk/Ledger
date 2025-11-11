import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate, updatePlatformMonthlyRevenue } from '@/lib';
import toast from 'react-hot-toast';

interface StudentFee {
  studentId: string;
  studentName: string;
  monthlyFee: number;
  approvedDays: number;
  absentDays: number;
  totalAmount: number;
  paymentStatus?: string;
  paymentDate?: Date;
  amountPaid?: number;
}

export const useStudentFees = (currentMonth: Date, refreshTrigger?: number) => {
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch student fees for the current month
   * 
   * IMPORTANT: Only includes active students (isActive !== false)
   * Discontinued students are excluded from fee calculations and display
   * 
   * @returns Array of student fee records for active students only
   */
  const fetchStudentFees = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      // Filter out inactive students (isActive === false) for fee calculations
      // Only active students should appear in fee summaries
      const studentsList = studentsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...(doc.data() as { monthlyFee?: number; displayName?: string; isActive?: boolean })
        }))
        .filter(student => student.isActive !== false); // Only include active students (default to true if undefined)
      const studentIds = studentsList.map(s => s.id);
      const batchSize = 30;
      let approvedAttendanceDocs: QueryDocumentSnapshot[] = [];
      let absentAttendanceDocs: QueryDocumentSnapshot[] = [];
      
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batchIds = studentIds.slice(i, i + batchSize);
        const approvedQuery = query(
          collection(db, 'attendance'),
          where('status', '==', 'approved'),
          where('date', '>=', formatLocalDate(monthStart)),
          where('date', '<=', formatLocalDate(monthEnd)),
          where('studentId', 'in', batchIds)
        );
        const absentQuery = query(
          collection(db, 'attendance'),
          where('status', '==', 'absent'),
          where('date', '>=', formatLocalDate(monthStart)),
          where('date', '<=', formatLocalDate(monthEnd)),
          where('studentId', 'in', batchIds)
        );
        const [approvedSnap, absentSnap] = await Promise.all([
          getDocs(approvedQuery),
          getDocs(absentQuery)
        ]);
        approvedAttendanceDocs = approvedAttendanceDocs.concat(approvedSnap.docs);
        absentAttendanceDocs = absentAttendanceDocs.concat(absentSnap.docs);
      }
      
      // Group attendance by studentId
      const approvedByStudent: Record<string, number> = {};
      approvedAttendanceDocs.forEach(doc => {
        const data = doc.data();
        if (!approvedByStudent[data.studentId]) approvedByStudent[data.studentId] = 0;
        approvedByStudent[data.studentId]++;
      });
      const absentByStudent: Record<string, number> = {};
      absentAttendanceDocs.forEach(doc => {
        const data = doc.data();
        if (!absentByStudent[data.studentId]) absentByStudent[data.studentId] = 0;
        absentByStudent[data.studentId]++;
      });
      
      // Calculate fees for each student
      const fees: StudentFee[] = studentsList.map(student => {
        const approvedDays = approvedByStudent[student.id] || 0;
        const absentDays = absentByStudent[student.id] || 0;
        const totalDaysInMonth = monthEnd.getDate();
        const monthlyFee = student.monthlyFee || 0;
        const dailyRate = monthlyFee > 0 ? monthlyFee / totalDaysInMonth : 0;
        const totalAmount = approvedDays * dailyRate;
        
        // Get payment status from totalDueByMonth
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        const totalDueByMonth = (student as any).totalDueByMonth || {};
        const monthData = totalDueByMonth[monthKey] || {};
        const paymentStatus = monthData.status || 'unpaid';
        const paymentDate = monthData.paymentDate?.toDate ? monthData.paymentDate.toDate() : null;
        const amountPaid = monthData.amountPaid || 0;
        
        return {
          studentId: student.id,
          studentName: student.displayName || 'Unknown Student',
          monthlyFee,
          approvedDays,
          absentDays,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paymentStatus,
          paymentDate,
          amountPaid,
        };
      });
      setStudentFees(fees);
    } catch (error) {
      console.error('Error fetching student fees:', error);
      toast.error('Failed to fetch student fees');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Handle mark as paid
  const handleMarkAsPaid = async (studentId: string, monthKey: string) => {
    const loadingToast = toast.loading('Recording payment...');
    try {
      const userRef = doc(db, 'users', studentId);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) throw new Error('Student not found');
      
      const totalDueByMonth = userDoc.data().totalDueByMonth || {};
      const monthDue = totalDueByMonth[monthKey];
      let dueAmount = 0;
      
      if (typeof monthDue === 'object' && monthDue !== null) {
        dueAmount = monthDue.due;
      } else if (typeof monthDue === 'number') {
        dueAmount = monthDue;
      } else {
        throw new Error('No due amount found for this month. Please recalculate fees first.');
      }

      if (dueAmount <= 0) {
        throw new Error('No amount due for this month');
      }

      await updateDoc(userRef, {
        [`totalDueByMonth.${monthKey}.status`]: 'paid',
        [`totalDueByMonth.${monthKey}.amountPaid`]: dueAmount,
        [`totalDueByMonth.${monthKey}.paymentDate`]: (await import('firebase/firestore')).serverTimestamp(),
      });
      
      // Update platform monthly revenue instantly for admin dashboard
      try {
        await updatePlatformMonthlyRevenue(monthKey);
      } catch (revenueError) {
        console.error('Error updating platform revenue:', revenueError);
        // Don't fail the payment if revenue update fails
      }
      
      toast.dismiss(loadingToast);
      toast.success(`Payment of ₹${dueAmount} recorded successfully!`);
      await fetchStudentFees();
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      console.error('Mark as paid error:', error);
      
      // Provide more specific error messages
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        toast.error('Permission denied. Please ensure you have teacher/admin access.');
      } else if (error instanceof Error) {
        if (error.message?.includes('No due amount found')) {
          toast.error(error.message);
        } else if (error.message?.includes('No amount due')) {
          toast.error(error.message);
        } else {
          toast.error('Failed to record payment: ' + error.message);
        }
      } else {
        toast.error('Failed to record payment: Unknown error');
      }
    }
  };

  // Utility to get month key
  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Load data when month changes or refresh is triggered
  useEffect(() => {
    fetchStudentFees();
  }, [currentMonth, fetchStudentFees, refreshTrigger]);

  return {
    studentFees,
    loading,
    fetchStudentFees,
    handleMarkAsPaid,
    getMonthKey
  };
};
