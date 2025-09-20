import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import Navigation from '../components/Navigation'
import { db, auth } from '../firebase'
import { formatLocalDate, formatDateDDMMYYYY } from '../lib/utils'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import logger from '../lib/logger'
import { debouncedToast } from '../lib/debouncedToast';
import Footer from '../components/Footer';
import { Link as LinkIcon } from 'lucide-react'
import { linkGoogleAccount } from '../lib/linkGoogleAccount'
import { formatDistanceToNow } from 'date-fns'
import { onSnapshot } from 'firebase/firestore'
import { Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { differenceInCalendarDays } from 'date-fns';

interface PendingAttendance {
  id: string
  studentId: string
  studentName: string
  date: string
  timestamp: Date
}

interface StudentFee {
  studentId: string
  studentName: string
  monthlyFee: number
  approvedDays: number
  absentDays: number
  totalAmount: number
}

interface StudentAccount {
  id: string
  username: string
  displayName: string
  monthlyFee: number
  createdAt: Date
  totalDueByMonth?: { [key: string]: any } 
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [pendingRequests, setPendingRequests] = useState<PendingAttendance[]>([])
  const [studentFees, setStudentFees] = useState<StudentFee[]>([])
  const [monthlyFee, setMonthlyFee] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Ref to track timeout for cleanup
  const monthChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Data Loading States
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false)
  const [studentFeesLoading, setStudentFeesLoading] = useState(false)
  const [monthlyFeeLoading, setMonthlyFeeLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  
  // User Management State
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newStudentUsername, setNewStudentUsername] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentPassword, setNewStudentPassword] = useState('')
  const [newStudentMonthlyFee, setNewStudentMonthlyFee] = useState(0)
  const [students, setStudents] = useState<StudentAccount[]>([])
  const [createUserLoading, setCreateUserLoading] = useState(false)

  // Monthly Fee Animation State
  const [isMonthlyFeeUpdated, setIsMonthlyFeeUpdated] = useState(false)

  // Bulk Attendance State
  const [showBulkAttendance, setShowBulkAttendance] = useState(false)
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [bulkAttendanceLoading, setBulkAttendanceLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const enableAdminSetup = import.meta.env.VITE_ENABLE_ADMIN_SETUP === 'true'
  const [existingAttendance, setExistingAttendance] = useState<Set<string>>(new Set())
  const [existingAbsentAttendance, setExistingAbsentAttendance] = useState<Set<string>>(new Set())
  
  // New state for enhanced bulk attendance
  const [defaultAttendanceStatus, setDefaultAttendanceStatus] = useState<'present' | 'absent'>('present')
  // Remove toggledDates state entirely

  // Add after other useState hooks
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [financialSummary, setFinancialSummary] = useState<{ revenue: number; lastUpdated: any } | null>(null)
  const [financialSummaryLoading, setFinancialSummaryLoading] = useState(true)

  // Revenue preview state
  const [revenuePreview, setRevenuePreview] = useState({
    days: 0,
    dailyRate: 0,
    total: 0,
  });

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (monthChangeTimeoutRef.current) {
        clearTimeout(monthChangeTimeoutRef.current)
      }
    }
  }, [])

  const checkTeacherSetup = useCallback(async () => {
    try {
      const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'))
      const teachersSnapshot = await getDocs(teachersQuery)
      setShowSetup(teachersSnapshot.empty)
    } catch (error: unknown) {
      logger.error('Error checking teacher setup:', error)
    }
  }, [])

  const setupAdminTeacher = async () => {
    if (!window.confirm('This will create the admin teacher account. Continue?')) {
      return
    }

    setLoading(true)
    try {
      const email = window.prompt('Enter admin teacher email:') || ''
      const password = window.prompt('Enter a strong password for admin teacher:') || ''
      if (!email || !password) {
        debouncedToast('Email and password are required', 'error')
        setLoading(false)
        return
      }
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: email,
        role: 'teacher',
        displayName: 'Admin Teacher',
        monthlyFee: 0,
        createdAt: new Date()
      })
      debouncedToast('Admin teacher account created successfully! Please store credentials securely.', 'success')
      await checkTeacherSetup()
    } catch (error: unknown) {
      logger.error('Error creating admin teacher account')
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        debouncedToast('Admin teacher account already exists. You can sign in with the saved credentials.', 'error')
      } else if (error instanceof Error) {
        debouncedToast(`Failed to create admin teacher account: ${error.message}`, 'error')
      } else {
        debouncedToast('Failed to create admin teacher account. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPendingRequests = useCallback(async () => {
    setPendingRequestsLoading(true)
    try {
      const q = query(
        collection(db, 'attendance'),
        where('status', '==', 'pending')
      )
      const querySnapshot = await getDocs(q)
      const requests: PendingAttendance[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          date: data.date,
          timestamp: data.timestamp?.toDate() || new Date()
        })
      })
      setPendingRequests(requests)
    } catch (error) {
      console.error('Error loading pending requests:', error)
      debouncedToast('Failed to load pending attendance requests. Please refresh the page and try again.', 'error')
    } finally {
      setPendingRequestsLoading(false)
    }
  }, [])

  const saveMonthlyRevenue = useCallback(async (revenue: number) => {
    if (!user?.uid) return
    try {
      const monthYear = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`
      const monthlySummaryRef = doc(db, 'users', user.uid, 'monthlySummaries', monthYear)
      await setDoc(monthlySummaryRef, {
        revenue,
        lastUpdated: new Date()
      }, { merge: true })
    } catch (error) {
      console.error('Error saving monthly revenue:', error)
    }
  }, [user?.uid, currentMonth])

  const loadMonthlyRevenue = useCallback(async () => {
    if (!user?.uid) return
    try {
      const monthYear = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`
      const monthlySummaryRef = doc(db, 'users', user.uid, 'monthlySummaries', monthYear)
      const docSnap = await getDoc(monthlySummaryRef)
      if (docSnap.exists()) {
        setTotalRevenue(docSnap.data().revenue || 0)
      } else {
        setTotalRevenue(0)
      }
    } catch (error) {
      console.error('Error loading monthly revenue:', error)
    }
  }, [user?.uid, currentMonth])

  const loadStudentFees = useCallback(async () => {
    setStudentFeesLoading(true)
    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
      const studentsSnapshot = await getDocs(studentsQuery)
      const fees: StudentFee[] = []
      for (const studentDoc of studentsSnapshot.docs) {
        const studentData = studentDoc.data()
        const [approvedAttendanceSnapshot, absentAttendanceSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'attendance'),
            where('studentId', '==', studentDoc.id),
            where('status', '==', 'approved'),
            where('date', '>=', formatLocalDate(monthStart)),
            where('date', '<=', formatLocalDate(monthEnd))
          )),
          getDocs(query(
            collection(db, 'attendance'),
            where('studentId', '==', studentDoc.id),
            where('status', '==', 'absent'),
            where('date', '>=', formatLocalDate(monthStart)),
            where('date', '<=', formatLocalDate(monthEnd))
          ))
        ])
        
        const approvedDays = approvedAttendanceSnapshot.size
        const absentDays = absentAttendanceSnapshot.size
        const totalDaysInMonth = monthEnd.getDate()
        const dailyRate = (studentData.monthlyFee || 0) / totalDaysInMonth
        const totalAmount = approvedDays * dailyRate
        fees.push({
          studentId: studentDoc.id,
          studentName: studentData.displayName || 'Unknown Student',
          monthlyFee: studentData.monthlyFee || 0,
          approvedDays,
          absentDays,
          totalAmount: Math.round(totalAmount * 100) / 100
        })
      }
      setStudentFees(fees)
      const total = fees.reduce((sum, fee) => sum + fee.totalAmount, 0)
      await saveMonthlyRevenue(total)
    } catch (error) {
      console.error('Error loading student fees:', error)
      debouncedToast('Failed to load student fee information. Please refresh the page and try again.', 'error')
    } finally {
      setStudentFeesLoading(false)
    }
  }, [currentMonth, saveMonthlyRevenue])

  const loadMonthlyFee = useCallback(async () => {
    if (!user?.uid) return
    setMonthlyFeeLoading(true)
    try {
      const teacherDoc = await getDoc(doc(db, 'users', user.uid))
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data()
        setMonthlyFee(teacherData.monthlyFee || 0)
      }
    } catch (error) {
      console.error('Error loading monthly fee:', error)
      debouncedToast('Failed to load monthly fee settings. Please refresh the page and try again.', 'error')
    } finally {
      setMonthlyFeeLoading(false)
    }
  }, [user?.uid])

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    try {
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentsList: StudentAccount[] = []
      studentsSnapshot.forEach((doc) => {
        const data = doc.data()
        studentsList.push({
          id: doc.id,
          username: data.username || 'Unknown Username',
          displayName: data.displayName || 'Unknown Student',
          monthlyFee: data.monthlyFee || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          totalDueByMonth: data.totalDueByMonth || {}, // Add this line
        })
      })
      setStudents(studentsList)
    } catch (error) {
      console.error('Error loading students:', error)
      debouncedToast('Failed to load student list. Please refresh the page and try again.', 'error')
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  const loadExistingAttendance = useCallback(async () => {
    try {
      // Get all approved and absent attendance records and filter by date in JavaScript to avoid index requirements
      const approvedAttendanceQuery = query(
        collection(db, 'attendance'),
        where('status', '==', 'approved')
      )
      
      const absentAttendanceQuery = query(
        collection(db, 'attendance'),
        where('status', '==', 'absent')
      )
      
      const [approvedAttendanceSnapshot, absentAttendanceSnapshot] = await Promise.all([
        getDocs(approvedAttendanceQuery),
        getDocs(absentAttendanceQuery)
      ])
      

      
      const presentDates = new Set<string>()
      const absentDates = new Set<string>()
      
      // Process approved records
      approvedAttendanceSnapshot.forEach((doc) => {
        const data = doc.data()
        // Parse the date string directly to avoid timezone issues
        const [year, month, day] = data.date.split('-').map(Number)
        const recordDate = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
        
        // Check if the date falls within the current month using date components
        if (recordDate.getFullYear() === currentMonth.getFullYear() && 
            recordDate.getMonth() === currentMonth.getMonth()) {
          presentDates.add(data.date)
        }
      })
      
      // Process absent records (these will be shown differently in the UI)
      absentAttendanceSnapshot.forEach((doc) => {
        const data = doc.data()
        // Parse the date string directly to avoid timezone issues
        const [year, month, day] = data.date.split('-').map(Number)
        const recordDate = new Date(year, month - 1, day) // month is 0-indexed in Date constructor
        
        // Check if the date falls within the current month using date components
        if (recordDate.getFullYear() === currentMonth.getFullYear() && 
            recordDate.getMonth() === currentMonth.getMonth()) {
          absentDates.add(data.date)
        }
      })
      
      setExistingAttendance(presentDates)
      setExistingAbsentAttendance(absentDates)
    } catch (error) {
      logger.error('Error loading existing attendance:', error)
      debouncedToast('Failed to load existing attendance data. Please refresh the page and try again.', 'error')
    } finally {
      // setRefreshAttendanceLoading(false) // Removed
    }
  }, [currentMonth])

  // Load existing attendance when bulk attendance modal opens
  useEffect(() => {
    if (user && showBulkAttendance) {
      loadExistingAttendance()
    }
  }, [user, showBulkAttendance, loadExistingAttendance])

  // Auto-refresh calendar when month changes
  useEffect(() => {
    if (user) {
      loadExistingAttendance()
    }
  }, [user, currentMonth, loadExistingAttendance])

  // Load initial data when user or month changes
  useEffect(() => {
    if (user) {
      loadPendingRequests()
      loadStudentFees()
      loadMonthlyFee()
      loadStudents()
      loadMonthlyRevenue()
      checkTeacherSetup()
    }
  }, [user, currentMonth, loadPendingRequests, loadStudentFees, loadMonthlyFee, loadStudents, loadMonthlyRevenue, checkTeacherSetup])

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadExistingAttendance();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, loadExistingAttendance]);

  // Real-time listener for monthly summary
  useEffect(() => {
    if (!user?.uid) return;
    setFinancialSummaryLoading(true);
    const monthYear = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    const summaryDocRef = doc(db, 'users', user.uid, 'monthlySummaries', monthYear);
    const unsubscribe = onSnapshot(summaryDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setFinancialSummary({
          revenue: docSnapshot.data().revenue || 0,
          lastUpdated: docSnapshot.data().lastUpdated || null,
        });
      } else {
        setFinancialSummary(null);
      }
      setFinancialSummaryLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid, currentMonth]);

  useEffect(() => {
    if (!bulkStartDate || !bulkEndDate || defaultAttendanceStatus !== 'present' || students.length === 0) {
      setRevenuePreview({ days: 0, dailyRate: 0, total: 0 });
      return;
    }
    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setRevenuePreview({ days: 0, dailyRate: 0, total: 0 });
      return;
    }
    // Number of days in range (inclusive)
    const days = differenceInCalendarDays(end, start) + 1;
    // Use the month of the start date for daily rate calculation
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    // Sum revenue for all students
    let total = 0;
    let dailyRate = 0;
    if (students.length > 0) {
      // Assume all students have the same month (start date's month)
      // If you want per-student breakdown, loop and sum
      dailyRate = students.reduce((sum, s) => sum + (s.monthlyFee / daysInMonth), 0);
      total = dailyRate * days;
    }
    setRevenuePreview({ days, dailyRate, total });
  }, [bulkStartDate, bulkEndDate, students, defaultAttendanceStatus]);

  const createStudentAccount = async () => {
    if (!newStudentUsername || !newStudentName || !newStudentPassword) {
      debouncedToast('Please fill in all fields', 'error')
      return
    }
    if (newStudentUsername.length < 3) {
      debouncedToast('Username must be at least 3 characters long', 'error')
      return
    }
    if (newStudentUsername.length > 50) {
      debouncedToast('Username must be less than 50 characters long', 'error')
      return
    }
    if (newStudentPassword.length < 6) {
      debouncedToast('Password must be at least 6 characters long', 'error')
      return
    }
    const existingStudentsQuery = query(
      collection(db, 'users'), 
      where('username', '==', newStudentUsername),
      where('role', '==', 'student')
    )
    const existingStudents = await getDocs(existingStudentsQuery)
    if (!existingStudents.empty) {
      debouncedToast(`Username "${newStudentUsername}" is already taken. Please choose a different username.`, 'error')
      return
    }

    setCreateUserLoading(true)
    try {
      const timestamp = Date.now()
      const uniqueEmail = `${newStudentUsername}_${timestamp}@ledger.student`
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth, 
        uniqueEmail, 
        newStudentPassword
      )
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        username: newStudentUsername,
        email: uniqueEmail,
        role: 'student',
        displayName: newStudentName,
        monthlyFee: newStudentMonthlyFee,
        createdAt: new Date(),
        createdBy: user?.uid
      })
      setNewStudentUsername('')
      setNewStudentName('')
      setNewStudentPassword('')
      setNewStudentMonthlyFee(0)
      setShowCreateUser(false)
      await loadStudents()
      debouncedToast(`Student account created successfully! Username: ${newStudentUsername}`, 'success')
    } catch (error: unknown) {
      console.error('Error creating student account:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        debouncedToast('Username is already taken. Please choose a different username.', 'error')
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/weak-password') {
        debouncedToast('Password is too weak. Please use a stronger password (at least 6 characters).', 'error')
      } else if (error instanceof Error) {
        debouncedToast(`Failed to create account: ${error.message}`, 'error')
      } else {
        debouncedToast('Failed to create account. Please try again.', 'error')
      }
    } finally {
      setCreateUserLoading(false)
    }
  }

  const updateMonthlyFee = async () => {
    if (!user?.uid) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        monthlyFee: monthlyFee
      })
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
      const studentsSnapshot = await getDocs(studentsQuery)
      const batch = writeBatch(db)
      studentsSnapshot.docs.forEach((studentDoc) => {
        batch.update(studentDoc.ref, { monthlyFee: monthlyFee })
      })
      await batch.commit()
      debouncedToast('Monthly fee updated successfully!', 'success')
      await loadStudentFees()
      setIsMonthlyFeeUpdated(true)
      setTimeout(() => setIsMonthlyFeeUpdated(false), 500)
    } catch (error) {
      console.error('Error updating monthly fee:', error)
      debouncedToast('Failed to update monthly fee', 'error')
    } finally {
      setLoading(false)
    }
  }

  const addBulkAttendance = async () => {
    if (!user?.uid) return
    if (!bulkStartDate || !bulkEndDate) {
      debouncedToast('Please select both start and end dates', 'error')
      return
    }
    const startDate = new Date(bulkStartDate)
    const endDate = new Date(bulkEndDate)
    if (startDate > endDate) {
      debouncedToast('Start date cannot be after end date', 'error')
      return
    }
    if (startDate < new Date('2020-01-01') || endDate > new Date('2030-12-31')) {
      debouncedToast('Please select dates between 2020 and 2030', 'error')
      return
    }

    // Calculate total records to check batch limits
    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
    const studentsSnapshot = await getDocs(studentsQuery)
    if (studentsSnapshot.empty) {
      debouncedToast('No students found to add attendance for', 'error')
      return
    }
    
    const totalRecords = daysCount * studentsSnapshot.size
    const maxBatchSize = 500 // Firestore batch limit
    
    if (totalRecords > maxBatchSize) {
      const estimatedBatches = Math.ceil(totalRecords / maxBatchSize)
      const proceed = window.confirm(
        `This operation will create ${totalRecords} attendance records and requires ${estimatedBatches} batch operations.\n\n` +
        `Large operations may take several minutes to complete.\n\n` +
        `Do you want to continue?`
      )
      if (!proceed) {
        return
      }
    }

    setBulkAttendanceLoading(true)
    try {
      let totalRecordsCreated = 0
      let presentRecords = 0
      let absentRecords = 0
      let currentBatch = writeBatch(db)
      let batchSize = 0
      
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateStr = formatLocalDate(currentDate)
        const finalStatus = defaultAttendanceStatus
        
        for (const studentDoc of studentsSnapshot.docs) {
          const studentData = studentDoc.data()
          const attendanceId = `${studentDoc.id}_${dateStr}`
          currentBatch.set(doc(db, 'attendance', attendanceId), {
            studentId: studentDoc.id,
            studentName: studentData.displayName || 'Unknown Student',
            date: dateStr,
            status: finalStatus === 'present' ? 'approved' : 'absent',
            timestamp: new Date(),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            approvedBy: user.uid,
            approvedAt: new Date()
          })
          
          totalRecordsCreated++
          batchSize++
          
          if (finalStatus === 'present') {
            presentRecords++
          } else {
            absentRecords++
          }
          
          // Commit batch when it reaches the limit
          if (batchSize >= maxBatchSize) {
            await currentBatch.commit()
            currentBatch = writeBatch(db)
            batchSize = 0
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Commit any remaining operations in the final batch
      if (batchSize > 0) {
        await currentBatch.commit()
      }
      
      const studentsCount = studentsSnapshot.size
      debouncedToast(`Bulk attendance added successfully!\n\n• Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n• Students: ${studentsCount}\n• Total Records: ${totalRecordsCreated}\n• Present: ${presentRecords}\n• Absent: ${absentRecords}\n• Days: ${daysCount}`, 'success')
      setBulkStartDate('')
      setBulkEndDate('')
      setDefaultAttendanceStatus('present')
      setShowBulkAttendance(false)
      await loadPendingRequests()
      await loadStudentFees()
      
      // Force a complete refresh of attendance data to ensure calendar updates
      // Clear existing data first, then reload with a small delay for Firebase sync
      setExistingAttendance(new Set())
      setExistingAbsentAttendance(new Set())
      await new Promise(resolve => setTimeout(resolve, 300)) // Increased delay for better Firebase sync
      await loadExistingAttendance()
    } catch (error) {
      console.error('Error adding bulk attendance:', error)
      debouncedToast('Failed to add bulk attendance', 'error')
    } finally {
      setBulkAttendanceLoading(false)
    }
  }

  const approveAttendance = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user?.uid) return
    setLoading(true)
    setStudentFeesLoading(true); // Show loader immediately
    try {
      await updateDoc(doc(db, 'attendance', requestId), {
        status: status,
        approvedBy: user.uid,
        approvedAt: new Date()
      })
      await loadPendingRequests()
      await loadStudentFees()
      await loadMonthlyRevenue()
      debouncedToast(`Attendance ${status} successfully!`, 'success')
    } catch (error) {
      console.error('Error updating attendance:', error)
      debouncedToast('Failed to update attendance', 'error')
    } finally {
      setLoading(false)
      setStudentFeesLoading(false); // Hide loader after data is fetched
    }
  }

  // Confetti function removed for performance optimization

  const changeMonth = (direction: 'prev' | 'next') => {
    // Clear any existing timeout
    if (monthChangeTimeoutRef.current) {
      clearTimeout(monthChangeTimeoutRef.current)
    }
    
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      // If navigating before platform start, show toast and set to current month
      if (newMonth < PLATFORM_START && prev >= PLATFORM_START) {
        debouncedToast('Started using platform from August 2025', 'error')
        loadExistingAttendance();
        return new Date()
      }
      if (newMonth < PLATFORM_START) {
        loadExistingAttendance();
        return new Date()
      }
      loadExistingAttendance();
      return newMonth
    })
    
    // Clear toggled dates when changing months
    // setToggledDates(new Set()) // Removed
    setExistingAbsentAttendance(new Set())
    
    // Refresh existing attendance for the new month
    // monthChangeTimeoutRef.current = setTimeout(() => loadExistingAttendance(), 100) // Removed
  }

  // Calendar helpers for month grid and bulk selection
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const toDateStr = (d: Date) => formatLocalDate(d)

  // Clear toggled dates when date range changes
  // const clearToggledDates = () => { // Removed
  //   setToggledDates(new Set())
  // }

  // Add back the setAllDatesInBulkRange function
  // const setAllDatesInBulkRange = () => { // Removed
  //   if (!bulkStartDate || !bulkEndDate) return;
  //   setToggledDates(new Set()); // All dates will match the bulk status
  // }

  const handleCalendarDayClick = (day: number | null) => {
    if (!day) return
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dateStr = toDateStr(date)

    // If a range is selected, do nothing (disable toggling individual days)
    if (bulkStartDate && bulkEndDate) {
      return
    }

    // Original date range selection logic
    if (!bulkStartDate) {
      setBulkStartDate(dateStr)
      setBulkEndDate('')
      return
    }
    if (bulkStartDate && !bulkEndDate) {
      if (new Date(dateStr) >= new Date(bulkStartDate)) {
        setBulkEndDate(dateStr)
        // Show toast if single date selected
        if (dateStr === bulkStartDate) {
          debouncedToast(`You selected ${new Date(dateStr).toLocaleDateString()} for attendance.`, 'success')
        } else {
          debouncedToast(`You selected ${new Date(bulkStartDate).toLocaleDateString()} to ${new Date(dateStr).toLocaleDateString()} for attendance.`, 'success')
        }
      } else {
        setBulkStartDate(dateStr)
        setBulkEndDate('')
      }
      return
    }
    // both set -> start new selection
    setBulkStartDate(dateStr)
    setBulkEndDate('')
  }

  const isSelected = (dateStr: string) => bulkStartDate === dateStr || bulkEndDate === dateStr
  const isInRange = (dateStr: string) => {
    if (!bulkStartDate || !bulkEndDate) return false
    const d = new Date(dateStr).getTime()
    const s = new Date(bulkStartDate).getTime()
    const e = new Date(bulkEndDate).getTime()
    return d >= s && d <= e
  }

  const getCellClasses = (day: number | null) => {
    if (!day) return 'bg-white'
    // const dateStr = day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : ''
    const selected = isSelected(day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : '')
    const inRange = isInRange(day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : '')
    const hasPresentAttendance = existingAttendance.has(day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : '')
    const hasAbsentAttendance = existingAbsentAttendance.has(day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : '')
    // const isToggled = toggledDates.has(dateStr) // Removed
    
    if (selected) return 'bg-blue-600 text-white'
    if (inRange) {
      // Dates in range show as the defaultAttendanceStatus
      return defaultAttendanceStatus === 'present' ? 'bg-blue-100 text-blue-800' : 'bg-red-50 text-red-700'
    }
    if (hasPresentAttendance) {
      // Present attendance shows as green
      return 'bg-green-100 text-green-800 border-green-300'
    }
    if (hasAbsentAttendance) {
      // Absent attendance shows as light red
      return 'bg-red-50 text-red-700 border-red-200'
    }
    return 'bg-gray-50'
  }

  // Removed unused helpers to satisfy TypeScript build

  // Delete student account and related attendance
  const deleteStudentAccount = async (studentId: string, username: string) => {
    if (!user?.uid) return

    if (!window.confirm(`Are you sure you want to delete student account for ${username}?\n\nThis will:\n• Delete their login credentials\n• Remove all attendance records\n• Delete their fee information\n• This action cannot be undone!`)) {
      return
    }

    setLoading(true)
    try {
      await deleteDoc(doc(db, 'users', studentId))

      const attendanceRef = collection(db, 'attendance')
      const attendanceQuery = query(attendanceRef, where('studentId', '==', studentId))
      const attendanceSnapshot = await getDocs(attendanceQuery)

      const batch = writeBatch(db)
      attendanceSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      debouncedToast(`Student account for ${username} deleted successfully!\n\nNote: The Firebase Auth user account still exists and needs to be manually removed from Firebase Console for complete cleanup.`, 'success')
      await loadStudents()
      await loadStudentFees()
    } catch (error: unknown) {
      console.error('Error deleting student account:', error)
      if (error instanceof Error) {
        debouncedToast(`Failed to delete account: ${error.message}`, 'error')
      } else {
        debouncedToast('Failed to delete account. Please try again.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  // Utility to get month key in 'YYYY-MM' format
  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Handler for marking a student's due as paid
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
      // Optionally refresh student fees after marking as paid
      await loadStudentFees();
    } catch (error: any) {
      toast.dismiss();
      toast.error('Failed to record payment: ' + (error?.message || 'Unknown error'));
    }
  };

  // Don't render if user is not available
  if (!user) {
    return null
  }

  const PLATFORM_START = new Date(import.meta.env.VITE_PLATFORM_START || '2025-08-01');
  const providerData = user?.providerData || [];
  const isGoogleLinked = providerData.some((provider: any) => provider.providerId === 'google.com');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadPendingRequests(),
        loadStudentFees(),
        loadMonthlyFee(),
        loadStudents(),
        loadMonthlyRevenue(),
        checkTeacherSetup(),
        loadExistingAttendance(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation title="Teacher Dashboard" onRefresh={handleRefresh} refreshing={refreshing} />
      
      <div className="container mx-auto px-6 py-8">
        {/* Account Settings Card for Google Link */}
        {user.role === 'teacher' && !isGoogleLinked && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Link your Google account for easier login and account recovery.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={linkGoogleAccount} className="w-full sm:w-auto">
                <LinkIcon className="mr-2 h-4 w-4" />
                Link Google Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header Section */}
        {/* Removed header section as per user request */}

        {/* Setup Section - Only shown when no teacher exists */}
        {enableAdminSetup && showSetup && (
          <Card className="mb-8 border-2 border-amber-200 bg-amber-50">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-amber-800">Initial Setup Required</CardTitle>
              <CardDescription className="text-amber-700">
                No teacher account exists. Please create the admin teacher account to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="max-w-md mx-auto space-y-4">
                <p className="text-sm text-amber-700">
                  This will create the admin teacher account. You will be asked to enter email and a strong password.
                </p>
                <Button 
                  onClick={setupAdminTeacher}
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {loading ? 'Creating...' : 'Create Admin Teacher Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Monthly Fee Settings */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Fee Settings</CardTitle>
              <CardDescription>Set the monthly fee for all students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="monthlyFee" className="text-sm font-medium">Monthly Fee (₹)</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(Number(e.target.value))}
                    placeholder="Enter monthly fee"
                    className={`mt-1 transition-all duration-300 ${isMonthlyFeeUpdated ? 'bg-blue-100 border-blue-400' : ''}`}
                  />
                </div>
                <Button 
                  onClick={updateMonthlyFee}
                  disabled={loading || monthlyFeeLoading}
                  className="w-full sm:w-auto"
                >
                  {loading ? 'Updating...' : monthlyFeeLoading ? 'Loading...' : 'Update Fee'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Revenue</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              {financialSummaryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : (
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      ₹{financialSummary?.revenue ?? totalRevenue}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {studentFees.filter(fee => fee.monthlyFee > 0).length} students
                    </p>
                  </div>
                  <div className="flex items-center gap-2 group" title={financialSummary?.lastUpdated ? financialSummary.lastUpdated.toDate().toLocaleString() : ''}>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground group-hover:underline cursor-help">
                      {financialSummary?.lastUpdated
                        ? `Updated ${formatDistanceToNow(financialSummary.lastUpdated.toDate())} ago`
                        : 'Loading...'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Summary & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Requests</CardTitle>
              <CardDescription>Attendance requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequestsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {pendingRequests.length === 1 ? 'request' : 'requests'} pending
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
                              <Button 
                  onClick={() => {
                    if (showBulkAttendance) {
                      // Clear form when hiding
                      setBulkStartDate('')
                      setBulkEndDate('')
                      // setToggledDates(new Set()) // Removed
                      // setDefaultAttendanceStatus('present') // Removed
                      setExistingAbsentAttendance(new Set())
                    }
                    setShowBulkAttendance(!showBulkAttendance)
                  }}
                  variant="outline"
                  className="w-full"
                >
                  {showBulkAttendance ? 'Hide Bulk Attendance' : 'Show Bulk Attendance'}
                </Button>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Calendar (removed) */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Management Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Student Management</CardTitle>
                  <CardDescription>Create and manage student accounts</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {showCreateUser ? 'Cancel' : 'Create New Student'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showCreateUser && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-4">Create New Student Account</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studentName">Student Name</Label>
                      <Input
                        id="studentName"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Enter student's full name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentUsername">Username</Label>
                      <Input
                        id="studentUsername"
                        type="text"
                        value={newStudentUsername}
                        onChange={(e) => setNewStudentUsername(e.target.value)}
                        placeholder="Enter student's username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentPassword">Password</Label>
                      <Input
                        id="studentPassword"
                        type="password"
                        value={newStudentPassword}
                        onChange={(e) => setNewStudentPassword(e.target.value)}
                        placeholder="Enter password"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentMonthlyFee">Monthly Fee (₹)</Label>
                      <Input
                        id="studentMonthlyFee"
                        type="number"
                        value={newStudentMonthlyFee}
                        onChange={(e) => setNewStudentMonthlyFee(Number(e.target.value))}
                        placeholder="Enter monthly fee"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={createStudentAccount}
                      disabled={createUserLoading}
                      className="w-full sm:w-auto"
                    >
                      {createUserLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Students List */}
              <div className="space-y-3">
                <h4 className="font-medium">Existing Students ({students.length})</h4>
                {studentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading students...</span>
                  </div>
                ) : students.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No students found</p>
                ) : (
                  students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{student.displayName}</p>
                        <p className="text-sm text-gray-600">
                          @{student.username} • ₹{student.monthlyFee}/month
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {student.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Active
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteStudentAccount(student.id, student.username)}
                          disabled={loading}
                          className="text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-colors duration-200"
                        >
                          {loading ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Attendance Requests</CardTitle>
              <CardDescription>Approve or reject student attendance</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{request.studentName}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(request.date).toLocaleDateString()} at {request.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveAttendance(request.id, 'approved')}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveAttendance(request.id, 'rejected')}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Student Fees Summary */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Student Fees Summary</CardTitle>
                <CardDescription>Monthly fee calculation based on approved attendance</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeMonth('prev')}
                >
                  ←
                </Button>
                <span className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeMonth('next')}
                >
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentFeesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading student fees...</span>
              </div>
            ) : (
              <div className="space-y-3 overflow-x-auto">
                {studentFees.map((fee) => {
                  const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                  const dailyRate = fee.monthlyFee > 0 ? fee.monthlyFee / totalDaysInMonth : 0;
                  const monthKey = getMonthKey(currentMonth);
                  const studentObj = students.find(s => s.id === fee.studentId);
                  let paymentStatus = null;
                  let paymentDate = null;
                  let amountPaid = null;
                  if (studentObj && studentObj.totalDueByMonth && studentObj.totalDueByMonth[monthKey]) {
                    const dueObj = studentObj.totalDueByMonth[monthKey];
                    paymentStatus = dueObj.status;
                    paymentDate = dueObj.paymentDate;
                    amountPaid = dueObj.amountPaid;
                  }
                  return (
                    <div key={fee.studentId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 sm:p-3 border rounded-lg min-w-[260px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base sm:text-lg truncate">{fee.studentName}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {fee.approvedDays} approved {fee.approvedDays === 1 ? 'day' : 'days'}
                          {fee.absentDays > 0 && (
                            <span className="text-red-600"> • {fee.absentDays} absent {fee.absentDays === 1 ? 'day' : 'days'}</span>
                          )}
                          {fee.monthlyFee > 0 ? (
                            <>
                              {' '}× ₹{Math.round(dailyRate * 100) / 100} = ₹{fee.totalAmount}
                              <span className="hidden sm:inline text-xs text-gray-500">
                                {' '} (₹{fee.monthlyFee} ÷ {totalDaysInMonth} days = ₹{Math.round(dailyRate * 100) / 100}/day)
                              </span>
                            </>
                          ) : ' (No fee set)'}
                        </p>
                        {/* Payment status display */}
                        {fee.monthlyFee > 0 && (
                          <div className="mt-1">
                            {paymentStatus === 'paid' ? (
                              <span className="text-green-600 text-xs font-semibold">
                                Paid{amountPaid ? `: ₹${amountPaid}` : ''}
                                {paymentDate && (
                                  <span className="ml-2 text-gray-500 hidden sm:inline">on {paymentDate?.toDate ? paymentDate.toDate().toLocaleDateString() : ''}</span>
                                )}
                              </span>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(fee.studentId, monthKey)} disabled={paymentStatus === 'paid'}>
                                Mark as Paid
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {fee.monthlyFee > 0 ? (
                          <p className="text-lg sm:text-xl font-bold text-green-600">₹{fee.totalAmount}</p>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500">No fee</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {studentFees.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No students with approved attendance or fees set for this month
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Attendance Form */}
        {showBulkAttendance && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Bulk Approved Attendance</CardTitle>
              <CardDescription>Enter a date range to add approved attendance for all students.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Month navigation for selection calendar */}
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Select Date Range</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => changeMonth('prev')}>←</Button>
                  <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => changeMonth('next')}>→</Button>
                </div>
              </div>

              {/* Calendar Legend */}
              <div className="mb-3 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span className="text-green-800">Present Attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                  <span className="text-red-700">Absent Attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                  <span className="text-red-800">Toggled to Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-blue-800">Selected Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded"></div>
                  <span className="text-blue-800">Date Range</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-50 border rounded"></div>
                  <span className="text-gray-600">No Attendance</span>
                </div>
              </div>



              {/* Selection Calendar - hidden on mobile, visible on sm+ */}
              <div className="hidden sm:block mb-4" key={`calendar-${existingAttendance.size}-${existingAbsentAttendance.size}`}> 
                <div className="overflow-x-auto">
                  <div className="min-w-[560px] grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-muted-foreground">{day}</div>
                  ))}
                  {currentMonth < PLATFORM_START ? (
                    <div className="text-center text-red-600 font-semibold py-8">
                      Started using platform from August 2025
                    </div>
                  ) : (
                  <>
                    {getDaysInMonth().map((day, idx) => {
                      const dateStr = day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : ''
                      const selected = day && isSelected(dateStr)
                      const hasPresentAttendance = day && existingAttendance.has(dateStr)
                      const hasAbsentAttendance = day && existingAbsentAttendance.has(dateStr)
                      return (
                        <div
                          key={idx}
                          className={`relative p-2 text-center border rounded-md min-h-[40px] flex items-center justify-center ${(!bulkStartDate || !bulkEndDate) ? 'cursor-pointer' : ''} ${getCellClasses(day)}`}
                          onClick={() => handleCalendarDayClick(day)}
                        >
                          {day && (
                            <>
                              <span className="font-medium select-none">{day}</span>
                              {selected && (
                                <span className="pointer-events-none absolute bottom-1 right-1">
                                  <span className="inline-block w-2 h-1 rounded-full bg-white"></span>
                                </span>
                              )}
                              {hasPresentAttendance && !selected && (
                                <span className="pointer-events-none absolute bottom-1 right-1">
                                  <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                                </span>
                              )}
                              {hasAbsentAttendance && !selected && (
                                <span className="pointer-events-none absolute bottom-1 right-1">
                                  <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
                </div>
                </div>
              </div>
              {/* Alternative content for mobile */}
              <div className="sm:hidden mb-4">
                <Card>
                  <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                      Bulk attendance calendar is available on larger screens.
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Status Selector */}
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <Label className="text-sm font-medium mb-3 block">Mark Selected Range as:</Label>
                {/* Segmented control for attendance status and set all */}
                <div className="flex gap-0 items-center rounded-lg overflow-hidden border w-fit bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultAttendanceStatus('present')
                      // setToggledDates(new Set()) // Removed
                    }}
                    className={`px-4 py-2 font-medium focus:outline-none border-r border-gray-200
                      transition duration-150 ease-in-out
                      ${defaultAttendanceStatus === 'present' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 hover:bg-blue-50'}`}
                    aria-pressed={defaultAttendanceStatus === 'present'}
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultAttendanceStatus('absent')
                      // setToggledDates(new Set()) // Removed
                    }}
                    className={`px-4 py-2 font-medium focus:outline-none border-r border-gray-200
                      transition duration-150 ease-in-out
                      ${defaultAttendanceStatus === 'absent' ? 'bg-red-600 text-white' : 'bg-white text-gray-800 hover:bg-red-50'}`}
                    aria-pressed={defaultAttendanceStatus === 'absent'}
                  >
                    Absent
                  </button>
                  {bulkStartDate && bulkEndDate && (
                    <button
                      type="button"
                      onClick={() => {
                        const startDate = new Date(bulkStartDate);
                        const endDate = new Date(bulkEndDate);
                        let allDaysMatchDefault = true;
                        let allDaysMatchOpposite = true;

                        const tempDate = new Date(startDate);
                        while (tempDate <= endDate) {
                          // Removed unused dateStr variable
                          const isToggled = false; // No individual toggling

                          // Determine effective status for this specific day
                          const effectiveStatus = isToggled
                            ? (defaultAttendanceStatus === 'present' ? 'absent' : 'present')
                            : defaultAttendanceStatus;

                          if (effectiveStatus !== defaultAttendanceStatus) {
                            allDaysMatchDefault = false;
                          }
                          if (effectiveStatus === defaultAttendanceStatus) {
                            allDaysMatchOpposite = false;
                          }
                          tempDate.setDate(tempDate.getDate() + 1);
                        }

                        if (allDaysMatchOpposite && !allDaysMatchDefault) {
                          // If all days have been effectively toggled to the opposite of the default,
                          // update the defaultAttendanceStatus to reflect this.
                          setDefaultAttendanceStatus(prevStatus => (prevStatus === 'present' ? 'absent' : 'present'));
                          // setToggledDates(new Set()); // Clear toggled dates as they are now the new default
                        }
                      }}
                      title={`Set all dates in range to ${defaultAttendanceStatus}`}
                      className={`flex items-center gap-2 px-4 py-2 font-medium focus:outline-none transition duration-150 ease-in-out
                        active:scale-95
                        ${defaultAttendanceStatus === 'present'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'}
                        `}
                    >
                      {defaultAttendanceStatus === 'present' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                      Set All
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Tip: After selecting a date range, click on individual days to toggle their status
                </p>
              </div>

              {/* Quick Date Presets */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Quick Presets:</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const weekAgo = new Date(today)
                      weekAgo.setDate(today.getDate() - 7)
                      setBulkStartDate(toDateStr(weekAgo))
                      setBulkEndDate(toDateStr(today))
                      // setToggledDates(new Set()) // Removed
                    }}
                    className="text-xs"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                      setBulkStartDate(toDateStr(monthStart));
                      setBulkEndDate(toDateStr(monthEnd));
                      // setToggledDates(new Set()) // Removed
                    }}
                    className="text-xs"
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      setBulkStartDate(toDateStr(today))
                      setBulkEndDate(toDateStr(today))
                      // setToggledDates(new Set()) // Removed
                    }}
                    className="text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkStartDate('')
                      setBulkEndDate('')
                      // setToggledDates(new Set()) // Removed
                    }}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="bulkStartDate">Start Date</Label>
                  <Input
                    id="bulkStartDate"
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => {
                      setBulkStartDate(e.target.value)
                      // setToggledDates(new Set()) // Removed
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bulkEndDate">End Date</Label>
                  <Input
                    id="bulkEndDate"
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => {
                      setBulkEndDate(e.target.value)
                      // setToggledDates(new Set()) // Removed
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Preview Section */}
              {bulkStartDate && bulkEndDate && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Preview:</h4>
                  <p className="text-sm text-blue-700">
                    Will mark <strong>{students.length}</strong> students as <strong>{defaultAttendanceStatus === 'present' ? 'Present' : 'Absent'}</strong>{' '}
                    {bulkStartDate === bulkEndDate ? (
                      <>for <strong>{formatDateDDMMYYYY(new Date(bulkStartDate))}</strong></>
                    ) : (
                      <>from <strong>{formatDateDDMMYYYY(new Date(bulkStartDate))}</strong> to <strong>{formatDateDDMMYYYY(new Date(bulkEndDate))}</strong></>
                    )}
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    Total records: <strong>{
                      students.length *
                      (bulkStartDate === bulkEndDate
                        ? 1
                        : Math.ceil((new Date(bulkEndDate).getTime() - new Date(bulkStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
                    }</strong>
                  </p>
                  {/* Revenue Preview */}
                  {defaultAttendanceStatus === 'present' && revenuePreview.days > 0 && revenuePreview.dailyRate > 0 && (
                    <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded">
                      <div className="font-semibold text-blue-900 mb-1">Estimated Revenue for this period:</div>
                      <div className="text-blue-800 text-sm">
                        {revenuePreview.days} days × ₹{(revenuePreview.dailyRate).toFixed(2)}/day = <span className="font-bold">₹{(revenuePreview.total).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={addBulkAttendance}
                  disabled={bulkAttendanceLoading || !bulkStartDate || !bulkEndDate}
                >
                  {bulkAttendanceLoading ? 'Applying...' : 'Apply Attendance'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkAttendance(false)
                    setBulkStartDate('')
                    setBulkEndDate('')
                    // setToggledDates(new Set()) // Removed
                    setDefaultAttendanceStatus('present')
                    setExistingAbsentAttendance(new Set())
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  )
}
