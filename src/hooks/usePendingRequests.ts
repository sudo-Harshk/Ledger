import { useState, useEffect, useMemo, useRef } from 'react';
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
  
  const studentStatusCacheRef = useRef<Record<string, { status: boolean; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000;

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
          
          if (requests.length > 0) {
            const studentIds = requests
              .map(r => r.studentId)
              .filter((id): id is string => !!id)
              .filter((id, index, self) => self.indexOf(id) === index);
            
            if (studentIds.length > 0) {
              try {
                const statusMap: Record<string, boolean> = {};
                const now = Date.now();
                const studentIdsToFetch: string[] = [];
                
                studentIds.forEach(id => {
                  const cached = studentStatusCacheRef.current[id];
                  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
                    statusMap[id] = cached.status;
                  } else {
                    studentIdsToFetch.push(id);
                  }
                });
                
                if (studentIdsToFetch.length > 0) {
                  const batchSize = 10;
                  
                  for (let i = 0; i < studentIdsToFetch.length; i += batchSize) {
                    const batch = studentIdsToFetch.slice(i, i + batchSize);
                    const studentDocs = await Promise.all(
                      batch.map(id => getDoc(doc(db, 'users', id)).catch(() => null))
                    );
                    
                    studentDocs.forEach((studentDoc, index) => {
                      const studentId = batch[index];
                      if (studentDoc?.exists()) {
                        const studentData = studentDoc.data();
                        const isActive = studentData.isActive !== false;
                        statusMap[studentId] = isActive;
                        studentStatusCacheRef.current[studentId] = {
                          status: isActive,
                          timestamp: now
                        };
                      } else {
                        statusMap[studentId] = true;
                        studentStatusCacheRef.current[studentId] = {
                          status: true,
                          timestamp: now
                        };
                      }
                    });
                  }
                }
                
                setStudentStatuses(statusMap);
              } catch (statusError) {
                console.error('Error fetching student statuses:', statusError);
                const fallbackStatuses: Record<string, boolean> = {};
                studentIds.forEach(id => {
                  const cached = studentStatusCacheRef.current[id];
                  fallbackStatuses[id] = cached?.status ?? true;
                });
                setStudentStatuses(fallbackStatuses);
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

  const pendingRequestsWithStatus = useMemo(() => {
    return pendingRequests.map(request => ({
      ...request,
      isStudentActive: request.studentId ? (studentStatuses[request.studentId] !== false) : true
    })) as PendingRequestWithStatus[];
  }, [pendingRequests, studentStatuses]);

  const approveAttendance = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!userUid) return;
    setLoading(true);
    try {
      const attendanceDoc = await getDoc(doc(db, 'attendance', requestId));
      if (!attendanceDoc.exists()) {
        debouncedToast('Attendance record not found', 'error');
        return;
      }
      
      const attendanceData = attendanceDoc.data();
      const studentId = attendanceData.studentId;
      const attendanceDate = new Date(attendanceData.date);
      
      if (status === 'approved' && studentId) {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          if (studentData.isActive === false) {
            debouncedToast('⚠️ Cannot approve attendance: Student account is discontinued. Please reactivate the student in Student Management before approving attendance.', 'error');
            setLoading(false);
            studentStatusCacheRef.current[studentId] = {
              status: false,
              timestamp: Date.now()
            };
            return;
          }
          studentStatusCacheRef.current[studentId] = {
            status: studentData.isActive !== false,
            timestamp: Date.now()
          };
        }
      }
      
      await updateDoc(doc(db, 'attendance', requestId), {
        status: status,
        approvedBy: userUid,
        approvedAt: new Date()
      });
      
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
