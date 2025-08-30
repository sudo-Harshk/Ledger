import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'
import Navigation from '../components/Navigation'
import { db, auth } from '../firebase'
import { formatLocalDate } from '../lib/utils'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import logger from '../lib/logger'

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
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [pendingRequests, setPendingRequests] = useState<PendingAttendance[]>([])
  const [studentFees, setStudentFees] = useState<StudentFee[]>([])
  const [monthlyFee, setMonthlyFee] = useState(0)
  const [loading, setLoading] = useState(false)
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

  // Bulk Attendance State
  const [showBulkAttendance, setShowBulkAttendance] = useState(false)
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkEndDate, setBulkEndDate] = useState('')
  const [bulkAttendanceLoading, setBulkAttendanceLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const enableAdminSetup = import.meta.env.VITE_ENABLE_ADMIN_SETUP === 'true'
  const [existingAttendance, setExistingAttendance] = useState<Set<string>>(new Set())
  const [existingAbsentAttendance, setExistingAbsentAttendance] = useState<Set<string>>(new Set())
  const [refreshAttendanceLoading, setRefreshAttendanceLoading] = useState(false)
  
  // New state for enhanced bulk attendance
  const [defaultAttendanceStatus, setDefaultAttendanceStatus] = useState<'present' | 'absent'>('present')
  const [toggledDates, setToggledDates] = useState<Set<string>>(new Set())





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
        alert('Email and password are required')
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
      alert('Admin teacher account created successfully! Please store credentials securely.')
      await checkTeacherSetup()
    } catch (error: unknown) {
      logger.error('Error creating admin teacher account')
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        alert('Admin teacher account already exists. You can sign in with the saved credentials.')
      } else if (error instanceof Error) {
        alert(`Failed to create admin teacher account: ${error.message}`)
      } else {
        alert('Failed to create admin teacher account. Please try again.')
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
      // Show user-friendly error message
      alert('Failed to load pending attendance requests. Please refresh the page and try again.')
    } finally {
      setPendingRequestsLoading(false)
    }
  }, [])

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
    } catch (error) {
      console.error('Error loading student fees:', error)
      // Show user-friendly error message
      alert('Failed to load student fee information. Please refresh the page and try again.')
    } finally {
      setStudentFeesLoading(false)
    }
  }, [currentMonth])

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
      // Show user-friendly error message
      alert('Failed to load monthly fee settings. Please refresh the page and try again.')
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
          createdAt: data.createdAt?.toDate() || new Date()
      })
      })
      setStudents(studentsList)
    } catch (error) {
      console.error('Error loading students:', error)
      // Show user-friendly error message
      alert('Failed to load student list. Please refresh the page and try again.')
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  const loadExistingAttendance = useCallback(async () => {
    setRefreshAttendanceLoading(true)
    try {
      console.log('Loading existing attendance for month:', currentMonth.toLocaleDateString())
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      console.log('Date range:', formatLocalDate(monthStart), 'to', formatLocalDate(monthEnd))
      
      // First, let's get all attendance records to see what's in the database
      const allAttendanceQuery = query(collection(db, 'attendance'))
      const allAttendanceSnapshot = await getDocs(allAttendanceQuery)
      console.log('Total attendance records in database:', allAttendanceSnapshot.size)
      
      // Log a few sample records to see the structure
      let index = 0
      allAttendanceSnapshot.forEach((doc) => {
        if (index < 5) { // Only log first 5 for debugging
          const data = doc.data()
          console.log('Sample record:', { id: doc.id, ...data })
        }
        index++
      })
      
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
      
      console.log('Found approved attendance records:', approvedAttendanceSnapshot.size)
      console.log('Found absent attendance records:', absentAttendanceSnapshot.size)
      
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
          console.log('Adding approved attendance date:', data.date, 'for student:', data.studentName)
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
          console.log('Adding absent attendance date:', data.date, 'for student:', data.studentName)
          absentDates.add(data.date)
        }
      })
      
      console.log('Setting present dates:', Array.from(presentDates))
      console.log('Setting absent dates:', Array.from(absentDates))
      setExistingAttendance(presentDates)
      setExistingAbsentAttendance(absentDates)
    } catch (error) {
      console.error('Error loading existing attendance:', error)
      // Show user-friendly error message
      alert('Failed to load existing attendance data. Please refresh the page and try again.')
    } finally {
      setRefreshAttendanceLoading(false)
    }
  }, [currentMonth])

  // Load existing attendance when bulk attendance modal opens
  useEffect(() => {
    if (user && showBulkAttendance) {
      console.log('Bulk attendance opened, loading existing attendance...')
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
      checkTeacherSetup()
    }
  }, [user, currentMonth, loadPendingRequests, loadStudentFees, loadMonthlyFee, loadStudents, checkTeacherSetup])

  const createStudentAccount = async () => {
    if (!newStudentUsername || !newStudentName || !newStudentPassword) {
      alert('Please fill in all fields')
      return
    }
    if (newStudentUsername.length < 3) {
      alert('Username must be at least 3 characters long')
      return
    }
    if (newStudentUsername.length > 50) {
      alert('Username must be less than 50 characters long')
      return
    }
    if (newStudentPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    const existingStudentsQuery = query(
      collection(db, 'users'), 
      where('username', '==', newStudentUsername),
      where('role', '==', 'student')
    )
    const existingStudents = await getDocs(existingStudentsQuery)
    if (!existingStudents.empty) {
      alert(`Username "${newStudentUsername}" is already taken. Please choose a different username.`)
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
      alert(`Student account created successfully! Username: ${newStudentUsername}`)
    } catch (error: unknown) {
      console.error('Error creating student account:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        alert('Username is already taken. Please choose a different username.')
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/weak-password') {
        alert('Password is too weak. Please use a stronger password (at least 6 characters).')
      } else if (error instanceof Error) {
        alert(`Failed to create account: ${error.message}`)
      } else {
        alert('Failed to create account. Please try again.')
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
      alert('Monthly fee updated successfully!')
      await loadStudentFees()
    } catch (error) {
      console.error('Error updating monthly fee:', error)
      alert('Failed to update monthly fee')
    } finally {
      setLoading(false)
    }
  }

  const addBulkAttendance = async () => {
    if (!user?.uid) return
    if (!bulkStartDate || !bulkEndDate) {
      alert('Please select both start and end dates')
      return
    }
    const startDate = new Date(bulkStartDate)
    const endDate = new Date(bulkEndDate)
    if (startDate > endDate) {
      alert('Start date cannot be after end date')
      return
    }
    if (startDate < new Date('2020-01-01') || endDate > new Date('2030-12-31')) {
      alert('Please select dates between 2020 and 2030')
      return
    }

    // Calculate total records to check batch limits
    const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'))
    const studentsSnapshot = await getDocs(studentsQuery)
    if (studentsSnapshot.empty) {
      alert('No students found to add attendance for')
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
        const isDateToggled = toggledDates.has(dateStr)
        const finalStatus = isDateToggled 
          ? (defaultAttendanceStatus === 'present' ? 'absent' : 'present')
          : defaultAttendanceStatus
        
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
      alert(`Bulk attendance added successfully!\n\n• Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n• Students: ${studentsCount}\n• Total Records: ${totalRecordsCreated}\n• Present: ${presentRecords}\n• Absent: ${absentRecords}\n• Days: ${daysCount}`)
      setBulkStartDate('')
      setBulkEndDate('')
      setToggledDates(new Set())
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
      alert('Failed to add bulk attendance')
    } finally {
      setBulkAttendanceLoading(false)
    }
  }

  const approveAttendance = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user?.uid) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'attendance', requestId), {
        status: status,
        approvedBy: user.uid,
        approvedAt: new Date()
      })
      // Confetti animation removed for performance
      await loadPendingRequests()
      await loadStudentFees()
      alert(`Attendance ${status} successfully!`)
    } catch (error) {
      console.error('Error updating attendance:', error)
      alert('Failed to update attendance')
    } finally {
      setLoading(false)
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
      return newMonth
    })
    
    // Clear toggled dates when changing months
    setToggledDates(new Set())
    setExistingAbsentAttendance(new Set())
    
    // Refresh existing attendance for the new month
    if (showBulkAttendance) {
      monthChangeTimeoutRef.current = setTimeout(() => loadExistingAttendance(), 100)
    }
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
  const clearToggledDates = () => {
    setToggledDates(new Set())
  }

  const handleCalendarDayClick = (day: number | null) => {
    if (!day) return
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dateStr = toDateStr(date)
    
    // If we have a date range selected, allow toggling individual days
    if (bulkStartDate && bulkEndDate && isInRange(dateStr)) {
      const newToggledDates = new Set(toggledDates)
      if (newToggledDates.has(dateStr)) {
        newToggledDates.delete(dateStr)
      } else {
        newToggledDates.add(dateStr)
      }
      setToggledDates(newToggledDates)
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
    const dateStr = day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : ''
    const selected = isSelected(dateStr)
    const inRange = isInRange(dateStr)
    const hasPresentAttendance = existingAttendance.has(dateStr)
    const hasAbsentAttendance = existingAbsentAttendance.has(dateStr)
    const isToggled = toggledDates.has(dateStr)
    
    if (selected) return 'bg-blue-600 text-white'
    if (inRange && isToggled) {
      // Toggled dates within range show as absent (red/orange)
      return 'bg-red-100 text-red-800 border-red-300'
    }
    if (inRange) return 'bg-blue-100 text-blue-800'
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

      alert(`Student account for ${username} deleted successfully!\n\nNote: The Firebase Auth user account still exists and needs to be manually removed from Firebase Console for complete cleanup.`)
      await loadStudents()
      await loadStudentFees()
    } catch (error: unknown) {
      console.error('Error deleting student account:', error)
      if (error instanceof Error) {
        alert(`Failed to delete account: ${error.message}`)
      } else {
        alert('Failed to delete account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Don't render if user is not available
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation title="Teacher Dashboard" />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Dashboard</h1>
          <p className="text-gray-600">Manage students, attendance, and fees</p>
        </div>

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
                    className="mt-1"
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
              <p className="text-3xl font-bold text-green-600">
                ₹{studentFees.reduce((sum, fee) => sum + fee.totalAmount, 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {studentFees.filter(fee => fee.monthlyFee > 0).length} students
              </p>
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
                      setToggledDates(new Set())
                      setDefaultAttendanceStatus('present')
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
                          variant="outline"
                          onClick={() => approveAttendance(request.id, 'rejected')}
                          disabled={loading}
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
                  const totalDaysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
                  const dailyRate = fee.monthlyFee > 0 ? fee.monthlyFee / totalDaysInMonth : 0
                  
                  return (
                    <div key={fee.studentId} className="flex items-center justify-between p-3 border rounded-lg min-w-[320px]">
                      <div>
                        <p className="font-medium">{fee.studentName}</p>
                        <p className="text-sm text-gray-600">
                          {fee.approvedDays} approved {fee.approvedDays === 1 ? 'day' : 'days'}
                          {fee.absentDays > 0 && (
                            <span className="text-red-600"> • {fee.absentDays} absent {fee.absentDays === 1 ? 'day' : 'days'}</span>
                          )}
                          {fee.monthlyFee > 0 ? (
                            <>
                              {' '}× ₹{Math.round(dailyRate * 100) / 100} = ₹{fee.totalAmount}
                              <br />
                              <span className="text-xs text-gray-500">
                                (₹{fee.monthlyFee} ÷ {totalDaysInMonth} days = ₹{Math.round(dailyRate * 100) / 100}/day)
                              </span>
                            </>
                          ) : ' (No fee set)'}
                        </p>
                      </div>
                      <div className="text-right">
                        {fee.monthlyFee > 0 ? (
                          <p className="text-lg font-bold text-green-600">₹{fee.totalAmount}</p>
                        ) : (
                          <p className="text-sm text-gray-500">No fee</p>
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
                  <Button 
                    onClick={loadExistingAttendance}
                    disabled={refreshAttendanceLoading}
                    className="w-full sm:w-auto"
                  >
                    {refreshAttendanceLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Refreshing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </div>
                    )}
                  </Button>
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



              {/* Selection Calendar */}
              <div className="mb-4" key={`calendar-${existingAttendance.size}-${existingAbsentAttendance.size}`}>
                <div className="overflow-x-auto">
                  <div className="min-w-[560px] grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-muted-foreground">{day}</div>
                  ))}
                  {getDaysInMonth().map((day, idx) => {
                    const dateStr = day ? toDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) : ''
                    const selected = day && isSelected(dateStr)
                    const hasPresentAttendance = day && existingAttendance.has(dateStr)
                    const hasAbsentAttendance = day && existingAbsentAttendance.has(dateStr)
                    return (
                      <div
                        key={idx}
                        className={`relative p-2 text-center border rounded-md min-h-[40px] flex items-center justify-center cursor-pointer ${getCellClasses(day)}`}
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
                </div>
                </div>
              </div>

              {/* Attendance Status Selector */}
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <Label className="text-sm font-medium mb-3 block">Mark Selected Range as:</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="attendanceStatus"
                      value="present"
                      checked={defaultAttendanceStatus === 'present'}
                      onChange={() => {
                        setDefaultAttendanceStatus('present')
                        clearToggledDates()
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Present</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="attendanceStatus"
                      value="absent"
                      checked={defaultAttendanceStatus === 'absent'}
                      onChange={() => {
                        setDefaultAttendanceStatus('absent')
                        clearToggledDates()
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">Absent</span>
                  </label>
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
                      clearToggledDates()
                    }}
                    className="text-xs"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                      setBulkStartDate(toDateStr(monthStart))
                      setBulkEndDate(toDateStr(today))
                      clearToggledDates()
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
                      const yesterday = new Date(today)
                      yesterday.setDate(today.getDate() - 1)
                      setBulkStartDate(toDateStr(yesterday))
                      setBulkEndDate(toDateStr(yesterday))
                      clearToggledDates()
                    }}
                    className="text-xs"
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      setBulkStartDate(toDateStr(today))
                      setBulkEndDate(toDateStr(today))
                      clearToggledDates()
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
                      clearToggledDates()
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
                      clearToggledDates()
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
                      clearToggledDates()
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
                    Will mark <strong>{students.length}</strong> students as <strong>{defaultAttendanceStatus === 'present' ? 'Present' : 'Absent'}</strong> from{' '}
                    <strong>{new Date(bulkStartDate).toLocaleDateString()}</strong> to{' '}
                    <strong>{new Date(bulkEndDate).toLocaleDateString()}</strong>
                  </p>
                  {toggledDates.size > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>{toggledDates.size}</strong> day{toggledDates.size === 1 ? '' : 's'} toggled to{' '}
                        <strong>{defaultAttendanceStatus === 'present' ? 'Absent' : 'Present'}</strong>:
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from(toggledDates).map(dateStr => (
                          <span key={dateStr} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            {new Date(dateStr).toLocaleDateString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-blue-600 mt-2">
                    Total records: <strong>{students.length * (Math.ceil((new Date(bulkEndDate).getTime() - new Date(bulkStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)}</strong>
                  </p>
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
                    setToggledDates(new Set())
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
    </div>
  )
}
