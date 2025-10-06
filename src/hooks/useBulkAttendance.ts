import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLocalDate, debouncedToast, dispatchAttendanceUpdatedEvent } from '@/lib';
import { differenceInCalendarDays } from 'date-fns';
import { useStudentFeeRecalculation } from './useStudentFeeRecalculation';

export const useBulkAttendance = (userUid: string | undefined, students: any[], currentMonth: Date, refreshTrigger?: number) => {
  const [showBulkAttendance, setShowBulkAttendance] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkAttendanceLoading, setBulkAttendanceLoading] = useState(false);
  const [defaultAttendanceStatus, setDefaultAttendanceStatus] = useState<'present' | 'absent'>('present');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState({
    presentDates: new Set<string>(),
    absentDates: new Set<string>(),
    studentAttendanceData: {} as Record<string, { presentDates: Set<string>, absentDates: Set<string> }>
  });
  const [revenuePreview, setRevenuePreview] = useState({
    days: 0,
    dailyRate: 0,
    total: 0,
  });
  const { recalculateAllStudents } = useStudentFeeRecalculation();

  // Auto-select students based on count
  useEffect(() => {
    if (students.length === 1) {
      // Auto-select single student
      setSelectedStudents([students[0].id]);
    } else if (students.length > 1 && selectedStudents.length === 0) {
      // Auto-select all students if none selected and multiple students exist
      setSelectedStudents(students.map(s => s.id));
    }
  }, [students, selectedStudents.length]);

  // Calculate revenue preview
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
      const selectedStudentData = students.filter(s => selectedStudents.includes(s.id));
      dailyRate = selectedStudentData.reduce((sum, s) => sum + (s.monthlyFee / daysInMonth), 0);
      total = dailyRate * days;
    }
    setRevenuePreview({ days, dailyRate, total });
  }, [bulkStartDate, bulkEndDate, selectedStudents, students, defaultAttendanceStatus]);

  // Load filtered attendance data based on selected students
  useEffect(() => {
    if (selectedStudents.length === 0) {
      setFilteredAttendanceData({
        presentDates: new Set<string>(),
        absentDates: new Set<string>(),
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
          const presentDates = new Set<string>();
          const absentDates = new Set<string>();
          const studentAttendanceData: Record<string, { presentDates: Set<string>, absentDates: Set<string> }> = {};
          
          // Initialize student data structures
          selectedStudents.forEach(studentId => {
            studentAttendanceData[studentId] = {
              presentDates: new Set<string>(),
              absentDates: new Set<string>()
            };
          });

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const studentId = data.studentId;
            
            // Only process data for selected students
            if (selectedStudents.includes(studentId)) {
              if (data.status === 'approved') {
                presentDates.add(data.date);
                studentAttendanceData[studentId].presentDates.add(data.date);
              } else if (data.status === 'absent') {
                absentDates.add(data.date);
                studentAttendanceData[studentId].absentDates.add(data.date);
              }
            }
          });
          
          setFilteredAttendanceData({ presentDates, absentDates, studentAttendanceData });
        } catch (error) {
          console.error('Error processing filtered attendance data:', error);
        }
      },
      (error) => {
        console.error('Error in filtered attendance data listener:', error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from filtered attendance data:', error);
      }
    };
  }, [selectedStudents, currentMonth, refreshTrigger]);

  // Add bulk attendance
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

    // Calculate total records to check batch limits
    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnapshot = await getDocs(studentsQuery);
    if (studentsSnapshot.empty) {
      debouncedToast('No students found to add attendance for', 'error');
      return;
    }
    
    // Filter to only selected students
    const filteredStudents = studentsSnapshot.docs.filter(doc => selectedStudents.includes(doc.id));
    if (filteredStudents.length === 0) {
      debouncedToast('No students selected for attendance', 'error');
      return;
    }
    
    const totalRecords = daysCount * filteredStudents.length;
    const maxBatchSize = 500;
    
    if (totalRecords > maxBatchSize) {
      const estimatedBatches = Math.ceil(totalRecords / maxBatchSize);
      const proceed = window.confirm(
        `This operation will create ${totalRecords} attendance records and requires ${estimatedBatches} batch operations.\n\n` +
        `Large operations may take several minutes to complete.\n\n` +
        `Do you want to continue?`
      );
      if (!proceed) {
        return;
      }
    }

    setBulkAttendanceLoading(true);
    try {
      let totalRecordsCreated = 0;
      let presentRecords = 0;
      let absentRecords = 0;
      let currentBatch = writeBatch(db);
      let batchSize = 0;
      
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatLocalDate(currentDate);
        const finalStatus = defaultAttendanceStatus;
        
        for (const studentDoc of filteredStudents) {
          const studentData = studentDoc.data();
          const attendanceId = `${studentDoc.id}_${dateStr}`;
          currentBatch.set(doc(db, 'attendance', attendanceId), {
            studentId: studentDoc.id,
            studentName: studentData.displayName || 'Unknown Student',
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
          
          // Commit batch when it reaches the limit
          if (batchSize >= maxBatchSize) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            batchSize = 0;
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Commit any remaining operations in the final batch
      if (batchSize > 0) {
        await currentBatch.commit();
      }
      
      const studentsCount = filteredStudents.length;
      debouncedToast(`Bulk attendance added successfully!\n\n• Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n• Students: ${studentsCount}\n• Total Records: ${totalRecordsCreated}\n• Present: ${presentRecords}\n• Absent: ${absentRecords}\n• Days: ${daysCount}`, 'success');
      
      // Dispatch event to refresh dashboard
      dispatchAttendanceUpdatedEvent();
      
      // Auto-recalculate fees for selected students if present attendance was added
      if (presentRecords > 0) {
        try {
          await recalculateAllStudents(startDate, false); // Disable toast notifications
        } catch (recalcError) {
          console.error('Error recalculating fees after bulk attendance:', recalcError);
          debouncedToast('Bulk attendance added, but failed to update fees. Please recalculate manually.', 'error');
        }
      }
      
      // Reset form
      setBulkStartDate('');
      setBulkEndDate('');
      setDefaultAttendanceStatus('present');
      setShowBulkAttendance(false);
    } catch (error) {
      console.error('Error adding bulk attendance:', error);
      debouncedToast('Failed to add bulk attendance', 'error');
    } finally {
      setBulkAttendanceLoading(false);
    }
  };

  // Calendar helpers
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

  const getCellClasses = useCallback((day: number | null, currentMonth: Date): string => {
    if (!day) return 'bg-white';
    const dateStr = day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : '';
    const selected = isSelected(dateStr);
    const inRange = isInRange(dateStr);
    
    const hasPresentAttendance = filteredAttendanceData.presentDates.has(dateStr);
    const hasAbsentAttendance = filteredAttendanceData.absentDates.has(dateStr);
    
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
  }, [defaultAttendanceStatus, isSelected, isInRange, toDateStr, filteredAttendanceData, currentMonth]);

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

  // Student selection helpers
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
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
    toDateStr
  };
};
