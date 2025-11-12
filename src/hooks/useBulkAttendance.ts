import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, query, where, getDocs, writeBatch, doc, getDoc, onSnapshot, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate, debouncedToast, dispatchAttendanceUpdatedEvent } from '@/lib';
import { differenceInCalendarDays } from 'date-fns';
import { useStudentFeeRecalculation } from './useStudentFeeRecalculation';
import type { StudentAccount } from '@/types';
import logger from '@/lib/logger';

export const useBulkAttendance = (userUid: string | undefined, students: StudentAccount[], currentMonth: Date, refreshTrigger?: number, isInitialLoad?: boolean) => {
  const [showBulkAttendance, setShowBulkAttendance] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkAttendanceLoading, setBulkAttendanceLoading] = useState(false);
  const [defaultAttendanceStatus, setDefaultAttendanceStatus] = useState<'present' | 'absent'>('present');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState<{
    presentDates: string[];
    absentDates: string[];
    studentAttendanceData: Record<string, { presentDates: string[], absentDates: string[] }>
  }>({
    presentDates: [],
    absentDates: [],
    studentAttendanceData: {}
  });
  const [revenuePreview, setRevenuePreview] = useState({
    days: 0,
    dailyRate: 0,
    total: 0,
  });
  const { recalculateAllStudents } = useStudentFeeRecalculation();

  const studentsMapRef = useRef<Map<string, StudentAccount>>(new Map());
  const studentIdsRef = useRef<string[]>([]);
  const studentIdsKeyRef = useRef<string>('');
  
  useEffect(() => {
    const currentKey = students
      .map(s => `${s.id}:${s.monthlyFee || 0}`)
      .sort()
      .join('|');
    
    const prevKey = studentIdsRef.current
      .map(id => {
        const student = studentsMapRef.current.get(id);
        return student ? `${id}:${student.monthlyFee || 0}` : '';
      })
      .filter(Boolean)
      .sort()
      .join('|');
    
    if (currentKey !== prevKey) {
      const ids = students.map(s => s.id).sort();
      studentIdsRef.current = ids;
      studentIdsKeyRef.current = ids.join(',');
      
      const map = new Map<string, StudentAccount>();
      students.forEach(student => {
        map.set(student.id, student);
      });
      studentsMapRef.current = map;
    }
  }, [students]);
  
  const studentIds = studentIdsRef.current;
  const studentIdsKey = studentIdsKeyRef.current;
  
  const lastAutoSelectedKeyRef = useRef<string>('');
  
  useEffect(() => {
    if (studentIdsKey === lastAutoSelectedKeyRef.current || studentIdsKey === '') {
      return;
    }
    
    lastAutoSelectedKeyRef.current = studentIdsKey;
    
    if (studentIds.length === 1) {
      const currentStudentId = studentIds[0];
      setSelectedStudents(prev => {
        if (prev.length === 1 && prev[0] === currentStudentId) {
          return prev;
        }
        return [currentStudentId];
      });
    } else if (studentIds.length > 1) {
      setSelectedStudents(prev => {
        if (prev.length === 0) {
          return [...studentIds];
        }
        return prev;
      });
    }
  }, [studentIdsKey, studentIds.length]);
  
  const selectedStudentsKey = useMemo(() => [...selectedStudents].sort().join(','), [selectedStudents]);
  
  useEffect(() => {
    if (!bulkStartDate || !bulkEndDate || defaultAttendanceStatus !== 'present' || selectedStudents.length === 0) {
      setRevenuePreview({ days: 0, dailyRate: 0, total: 0 });
      return;
    }
    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setRevenuePreview({ days: 0, dailyRate: 0, total: 0 });
      return;
    }
    
    const days = differenceInCalendarDays(end, start) + 1;
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    
    let total = 0;
    let dailyRate = 0;
    if (selectedStudents.length > 0) {
      dailyRate = selectedStudents.reduce((sum, studentId) => {
        const student = studentsMapRef.current.get(studentId);
        return sum + (student?.monthlyFee || 0) / daysInMonth;
      }, 0);
      total = dailyRate * days;
    }
    setRevenuePreview({ days, dailyRate, total });
  }, [bulkStartDate, bulkEndDate, selectedStudentsKey, studentIdsKey, defaultAttendanceStatus]);
  
  const currentMonthKey = useMemo(() => `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`, [currentMonth]);
  
  useEffect(() => {
    if (isInitialLoad) {
      return;
    }
    
    const selectedStudentsSnapshot = [...selectedStudents];
    
    if (selectedStudentsSnapshot.length === 0) {
      setFilteredAttendanceData({
        presentDates: [],
        absentDates: [],
        studentAttendanceData: {}
      });
      return;
    }

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
          const presentDatesSet = new Set<string>();
          const absentDatesSet = new Set<string>();
          const studentAttendanceData: Record<string, { presentDates: string[], absentDates: string[] }> = {};
          
          selectedStudentsSnapshot.forEach(studentId => {
            studentAttendanceData[studentId] = {
              presentDates: [],
              absentDates: []
            };
          });

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const studentId = data.studentId;
            
            if (selectedStudentsSnapshot.includes(studentId)) {
              if (data.status === 'approved') {
                presentDatesSet.add(data.date);
                if (!studentAttendanceData[studentId].presentDates.includes(data.date)) {
                  studentAttendanceData[studentId].presentDates.push(data.date);
                }
              } else if (data.status === 'absent') {
                absentDatesSet.add(data.date);
                if (!studentAttendanceData[studentId].absentDates.includes(data.date)) {
                  studentAttendanceData[studentId].absentDates.push(data.date);
                }
              }
            }
          });
          
          setFilteredAttendanceData({ 
            presentDates: Array.from(presentDatesSet).sort(), 
            absentDates: Array.from(absentDatesSet).sort(), 
            studentAttendanceData 
          });
        } catch (error) {
          logger.error('Error processing filtered attendance data:', error);
        }
      },
      (error) => {
        logger.error('Error in filtered attendance data listener:', error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        logger.error('Error unsubscribing from filtered attendance data:', error);
      }
    };
  }, [selectedStudentsKey, currentMonthKey, refreshTrigger, isInitialLoad]);

  const addBulkAttendance = async () => {
    if (!userUid) return;
    if (!bulkStartDate || !bulkEndDate) {
      debouncedToast('Please select both start and end dates', 'error');
      return;
    }
    
    const startDate = new Date(bulkStartDate);
    const endDate = new Date(bulkEndDate);
    if (startDate > endDate) {
      debouncedToast('Start date cannot be after end date', 'error');
      return;
    }
    if (startDate < new Date('2020-01-01') || endDate > new Date('2030-12-31')) {
      debouncedToast('Please select dates between 2020 and 2030', 'error');
      return;
    }

    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnapshot = await getDocs(studentsQuery);
    if (studentsSnapshot.empty) {
      debouncedToast('No students found to add attendance for', 'error');
      return;
    }
    
    const filteredStudents = studentsSnapshot.docs.filter(doc => selectedStudents.includes(doc.id));
    if (filteredStudents.length === 0) {
      debouncedToast('No students selected for attendance', 'error');
      return;
    }
    
    setBulkAttendanceLoading(true);
    try {
      const studentStatusChecks = await Promise.all(
        filteredStudents.map(async (studentDoc) => {
          try {
            const studentDocRef = doc(db, 'users', studentDoc.id);
            const studentSnapshot = await getDoc(studentDocRef);
            if (studentSnapshot.exists()) {
              const studentData = studentSnapshot.data();
              return {
                id: studentDoc.id,
                isActive: studentData.isActive !== false,
                studentData: studentSnapshot.data()
              };
            }
            return { id: studentDoc.id, isActive: true, studentData: studentDoc.data() };
          } catch (error) {
            logger.error(`Error checking student ${studentDoc.id}:`, error);
            return { id: studentDoc.id, isActive: true, studentData: studentDoc.data() };
          }
        })
      );
      
      const activeStudentsForAttendance = studentStatusChecks.filter(s => s.isActive);
      const inactiveStudents = studentStatusChecks.filter(s => !s.isActive);
      
      if (inactiveStudents.length > 0) {
        const inactiveNames = inactiveStudents.map(s => s.studentData?.displayName || s.id).join(', ');
        debouncedToast(
          `⚠️ Warning: ${inactiveStudents.length} student(s) (${inactiveNames}) are discontinued and will be skipped.`,
          'error'
        );
      }
      
      if (activeStudentsForAttendance.length === 0) {
        debouncedToast('No active students selected for attendance. Please select active students.', 'error');
        setBulkAttendanceLoading(false);
        return;
      }
      
      let totalRecordsCreated = 0;
      let presentRecords = 0;
      let absentRecords = 0;
      let currentBatch = writeBatch(db);
      let batchSize = 0;
      const maxBatchSize = 500;
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatLocalDate(currentDate);
        const finalStatus = defaultAttendanceStatus;
        
        for (const activeStudent of activeStudentsForAttendance) {
          try {
            const studentData = activeStudent.studentData;
            const attendanceId = `${activeStudent.id}_${dateStr}`;
            currentBatch.set(doc(db, 'attendance', attendanceId), {
              studentId: activeStudent.id,
              studentName: studentData?.displayName || 'Unknown Student',
              date: dateStr,
              status: finalStatus === 'present' ? 'approved' : 'absent',
              timestamp: new Date(),
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear(),
              approvedBy: userUid,
              approvedAt: new Date()
            });
            
            totalRecordsCreated++;
            batchSize++;
            
            if (finalStatus === 'present') {
              presentRecords++;
            } else {
              absentRecords++;
            }
            
            if (batchSize >= maxBatchSize) {
              await currentBatch.commit();
              currentBatch = writeBatch(db);
              batchSize = 0;
            }
          } catch (studentError) {
            logger.error(`Error preparing attendance for student ${activeStudent.id} on ${dateStr}:`, studentError);
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (batchSize > 0) {
        try {
          await currentBatch.commit();
        } catch (batchError) {
          logger.error('Error committing final batch:', batchError);
          throw batchError;
        }
      }
      
      const studentsCount = activeStudentsForAttendance.length;
      const skippedCount = inactiveStudents.length;
      let successMessage = `Bulk attendance added successfully!\n\n• Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n• Students: ${studentsCount}\n• Total Records: ${totalRecordsCreated}\n• Present: ${presentRecords}\n• Absent: ${absentRecords}\n• Days: ${daysCount}`;
      if (skippedCount > 0) {
        successMessage += `\n• Skipped: ${skippedCount} inactive student(s)`;
      }
      debouncedToast(successMessage, 'success');
      
      dispatchAttendanceUpdatedEvent();
      
      if (presentRecords > 0 && activeStudentsForAttendance.length > 0) {
        try {
          await recalculateAllStudents(startDate, false);
        } catch (recalcError) {
          logger.error('Error recalculating fees after bulk attendance:', recalcError);
          debouncedToast('Bulk attendance added, but failed to update fees. Please recalculate manually.', 'error');
        }
      }
      
      setBulkStartDate('');
      setBulkEndDate('');
      setDefaultAttendanceStatus('present');
      setShowBulkAttendance(false);
    } catch (error) {
      logger.error('Error adding bulk attendance:', error);
      
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'permission-denied') {
          debouncedToast('Permission denied: Unable to add bulk attendance. Some students may have been marked as inactive during the operation. Please refresh and try again.', 'error');
        } else if (error.code === 'unavailable') {
          debouncedToast('Network error: Please check your connection and try again.', 'error');
        } else if (error.code === 'resource-exhausted') {
          debouncedToast('Operation too large: Please reduce the date range or number of students and try again.', 'error');
        } else if (error.code === 'failed-precondition') {
          debouncedToast('Operation failed: Some students may have been modified during the operation. Please refresh and try again.', 'error');
        } else {
          debouncedToast(`Failed to add bulk attendance: ${error.code}. Please try again.`, 'error');
        }
      } else {
        debouncedToast('Failed to add bulk attendance. Please try again.', 'error');
      }
    } finally {
      setBulkAttendanceLoading(false);
    }
  };

  const toDateStr = useCallback((d: Date) => formatLocalDate(d), []);

  const isSelected = useCallback((dateStr: string) => 
    bulkStartDate === dateStr || bulkEndDate === dateStr, 
    [bulkStartDate, bulkEndDate]
  );

  const isInRange = useCallback((dateStr: string) => {
    if (!bulkStartDate || !bulkEndDate) return false;
    const d = new Date(dateStr).getTime();
    const s = new Date(bulkStartDate).getTime();
    const e = new Date(bulkEndDate).getTime();
    return d >= s && d <= e;
  }, [bulkStartDate, bulkEndDate]);

  const presentDatesSet = useMemo(() => new Set(filteredAttendanceData.presentDates), [filteredAttendanceData.presentDates]);
  const absentDatesSet = useMemo(() => new Set(filteredAttendanceData.absentDates), [filteredAttendanceData.absentDates]);
  
  const getCellClasses = useCallback((day: number | null, currentMonth: Date): string => {
    if (!day) return 'bg-white';
    const dateStr = day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : '';
    const selected = isSelected(dateStr);
    const inRange = isInRange(dateStr);
    
    const hasPresentAttendance = presentDatesSet.has(dateStr);
    const hasAbsentAttendance = absentDatesSet.has(dateStr);
    
    if (selected) return 'bg-blue-600 text-white';
    if (inRange) {
      return defaultAttendanceStatus === 'present' ? 'bg-blue-100 text-blue-800' : 'bg-red-50 text-red-700';
    }
    if (hasPresentAttendance) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    if (hasAbsentAttendance) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    return 'bg-gray-50';
  }, [defaultAttendanceStatus, isSelected, isInRange, toDateStr, presentDatesSet, absentDatesSet, currentMonth]);

  const handleCalendarDayClick = useCallback((day: number | null, currentMonth: Date) => {
    if (!day) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = toDateStr(date);
    if (bulkStartDate && bulkEndDate) return;
    if (!bulkStartDate) {
      setBulkStartDate(dateStr);
      setBulkEndDate('');
      return;
    }
    if (bulkStartDate && !bulkEndDate) {
      if (new Date(dateStr) >= new Date(bulkStartDate)) {
        setBulkEndDate(dateStr);
        if (dateStr === bulkStartDate) {
          debouncedToast(`You selected ${new Date(dateStr).toLocaleDateString()} for attendance.`, 'success');
        } else {
          debouncedToast(`You selected ${new Date(bulkStartDate).toLocaleDateString()} to ${new Date(dateStr).toLocaleDateString()} for attendance.`, 'success');
        }
      } else {
        setBulkStartDate(dateStr);
        setBulkEndDate('');
      }
      return;
    }
    setBulkStartDate(dateStr);
    setBulkEndDate('');
  }, [bulkStartDate, bulkEndDate, toDateStr]);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents([...studentIds]);
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  return {
    showBulkAttendance,
    setShowBulkAttendance,
    bulkStartDate,
    setBulkStartDate,
    bulkEndDate,
    setBulkEndDate,
    bulkAttendanceLoading,
    defaultAttendanceStatus,
    setDefaultAttendanceStatus,
    selectedStudents,
    setSelectedStudents,
    toggleStudentSelection,
    selectAllStudents,
    deselectAllStudents,
    filteredAttendanceData,
    revenuePreview,
    addBulkAttendance,
    isSelected,
    isInRange,
    getCellClasses,
    handleCalendarDayClick,
  };
};
