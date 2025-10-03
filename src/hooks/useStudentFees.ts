import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate } from '@/lib';
import toast from 'react-hot-toast';

interface StudentFee {
  studentId: string;
  studentName: string;
  monthlyFee: number;
  approvedDays: number;
  absentDays: number;
  totalAmount: number;
}

export const useStudentFees = (currentMonth: Date) => {
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch student fees
  const fetchStudentFees = async () => {
    setLoading(true);
    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as { monthlyFee?: number; displayName?: string })
      }));
      const studentIds = studentsList.map(s => s.id);
      const batchSize = 30;
      let approvedAttendanceDocs: any[] = [];
      let absentAttendanceDocs: any[] = [];
      
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
        return {
          studentId: student.id,
          studentName: student.displayName || 'Unknown Student',
          monthlyFee,
          approvedDays,
          absentDays,
          totalAmount: Math.round(totalAmount * 100) / 100,
        };
      });
      setStudentFees(fees);
    } catch (error) {
      console.error('Error fetching student fees:', error);
      toast.error('Failed to fetch student fees');
    } finally {
      setLoading(false);
    }
  };

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
        throw new Error('No due found for this month');
      }
      await updateDoc(userRef, {
        [`totalDueByMonth.${monthKey}.status`]: 'paid',
        [`totalDueByMonth.${monthKey}.amountPaid`]: dueAmount,
        [`totalDueByMonth.${monthKey}.paymentDate`]: (await import('firebase/firestore')).serverTimestamp(),
      });
      toast.dismiss(loadingToast);
      toast.success('Payment recorded!');
      await fetchStudentFees();
    } catch (error: any) {
      toast.dismiss();
      toast.error('Failed to record payment: ' + (error?.message || 'Unknown error'));
    }
  };

  // Utility to get month key
  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Load data when month changes
  useEffect(() => {
    fetchStudentFees();
  }, [currentMonth]);

  return {
    studentFees,
    loading,
    fetchStudentFees,
    handleMarkAsPaid,
    getMonthKey
  };
};
