import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast, dispatchAttendanceUpdatedEvent } from '@/lib';
import { useStudentFeeRecalculation } from './useStudentFeeRecalculation';
import type { PendingRequest } from '@/types';

export interface PendingRequestWithStatus extends PendingRequest {
  isStudentActive?: boolean;
}

export const usePendingRequests = (userUid: string | undefined) => {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { recalculateSingleStudent } = useStudentFeeRecalculation();

  // Real-time listener for pending requests
  useEffect(() => {
    if (!userUid) return;

    const q = query(collection(db, 'attendance'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, 
      async (querySnapshot: QuerySnapshot<DocumentData>) => {
        try {
          const requests = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as PendingRequest[];
          setPendingRequests(requests);
          
          // Fetch student statuses for all pending requests
          if (requests.length > 0) {
            const studentIds = requests
              .map(r => r.studentId)
              .filter((id): id is string => !!id)
              .filter((id, index, self) => self.indexOf(id) === index); // Unique IDs
            
            if (studentIds.length > 0) {
              try {
                // Fetch student documents in batches
                const statusMap: Record<string, boolean> = {};
                const batchSize = 10;
                
                for (let i = 0; i < studentIds.length; i += batchSize) {
                  const batch = studentIds.slice(i, i + batchSize);
                  const studentDocs = await Promise.all(
                    batch.map(id => getDoc(doc(db, 'users', id)).catch(() => null))
                  );
                  
                  studentDocs.forEach((studentDoc, index) => {
                    if (studentDoc?.exists()) {
                      const studentData = studentDoc.data();
                      statusMap[batch[index]] = studentData.isActive !== false; // Default to true if undefined
                    } else {
                      statusMap[batch[index]] = true; // Default to active if document doesn't exist or error
                    }
                  });
                }
                
                setStudentStatuses(statusMap);
              } catch (statusError) {
                console.error('Error fetching student statuses:', statusError);
                // Don't fail the entire operation if status fetch fails
              }
            }
          } else {
            setStudentStatuses({});
          }
        } catch (error) {
          console.error('Error processing pending requests:', error);
        }
      },
      (error) => {
        if (error.code === 'permission-denied') {
          return;
        }
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

  // Combine pending requests with student statuses
  const pendingRequestsWithStatus = useMemo(() => {
    return pendingRequests.map(request => ({
      ...request,
      isStudentActive: request.studentId ? (studentStatuses[request.studentId] !== false) : true
    })) as PendingRequestWithStatus[];
  }, [pendingRequests, studentStatuses]);

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
      
      // Check if student is active before approving
      if (status === 'approved' && studentId) {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          // If student is inactive (isActive === false), prevent approval
          if (studentData.isActive === false) {
            debouncedToast('Cannot approve attendance: Student account is discontinued. Please reactivate the student first.', 'error');
            setLoading(false);
            return;
          }
        }
      }
      
      await updateDoc(doc(db, 'attendance', requestId), {
        status: status,
        approvedBy: userUid,
        approvedAt: new Date()
      });
      
      // Auto-recalculate fees for this student if attendance is approved
      if (status === 'approved' && studentId) {
        try {
          await recalculateSingleStudent(studentId, attendanceDate, false);
          debouncedToast(`Attendance approved!`, 'success');
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
    pendingRequests: pendingRequestsWithStatus,
    loading,
    approveAttendance
  };
};
