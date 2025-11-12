import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate } from '@/lib';
import logger from '@/lib/logger';

export const useAttendanceData = (currentMonth: Date) => {
  const [attendanceData, setAttendanceData] = useState({ presentDates: new Set(), absentDates: new Set() });

  // Real-time listener for attendance data
  useEffect(() => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const q = query(
      collection(db, 'attendance'),
      where('date', '>=', formatLocalDate(monthStart)),
      where('date', '<=', formatLocalDate(monthEnd))
    );
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        try {
          const presentDates = new Set();
          const absentDates = new Set();
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'approved') {
              presentDates.add(data.date);
            } else if (data.status === 'absent') {
              absentDates.add(data.date);
            }
          });
          setAttendanceData({ presentDates, absentDates });
        } catch (error) {
          logger.error('Error processing attendance data:', error);
        }
      },
      (error) => {
        logger.error('Error in attendance data listener:', error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        logger.error('Error unsubscribing from attendance data:', error);
      }
    };
  }, [currentMonth]);

  return attendanceData;
};
