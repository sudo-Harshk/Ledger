import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast, dispatchAttendanceUpdatedEvent } from '@/lib';
import { useStudentFeeRecalculation } from './useStudentFeeRecalculation';

interface PendingRequest {
  id: string;
  studentName: string;
  date: string;
  timestamp: any;
  status: string;
  [key: string]: any; 
}

export const usePendingRequests = (userUid: string | undefined) => {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { recalculateSingleStudent } = useStudentFeeRecalculation();

  // Real-time listener for pending requests
  useEffect(() => {
    if (!userUid) return;

    const q = query(collection(db, 'attendance'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        try {
          const requests = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as PendingRequest[];
          setPendingRequests(requests);
        } catch (error) {
          console.error('Error processing pending requests:', error);
        }
      },
      (error) => {
        console.error('Error in pending requests listener:', error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from pending requests:', error);
      }
    };
  }, [userUid]);

  // Approve or reject attendance
  const approveAttendance = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!userUid) return;
    setLoading(true);
    try {
      // Get attendance record to extract student ID
      const attendanceDoc = await getDoc(doc(db, 'attendance', requestId));
      if (!attendanceDoc.exists()) {
        debouncedToast('Attendance record not found', 'error');
        return;
      }
      
      const attendanceData = attendanceDoc.data();
      const studentId = attendanceData.studentId;
      const attendanceDate = new Date(attendanceData.date);
      
      await updateDoc(doc(db, 'attendance', requestId), {
        status: status,
        approvedBy: userUid,
        approvedAt: new Date()
      });
      
      // Auto-recalculate fees for this student if attendance is approved
      if (status === 'approved' && studentId) {
        try {
          await recalculateSingleStudent(studentId, attendanceDate, false);
          debouncedToast(`Attendance approved and fees updated!`, 'success');
        } catch (recalcError) {
          console.error('Error recalculating fees after approval:', recalcError);
          debouncedToast(`Attendance approved, but failed to update fees. Please recalculate manually.`, 'error');
        }
      } else {
        debouncedToast(`Attendance ${status} successfully!`, 'success');
      }
      
      dispatchAttendanceUpdatedEvent();
    } catch (error) {
      console.error('Error updating attendance:', error);
      debouncedToast('Failed to update attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingRequests,
    loading,
    approveAttendance
  };
};
