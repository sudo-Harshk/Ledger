import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAuth } from '../hooks/useAuth'
import Navigation from '../components/Navigation'
import { db } from '../firebase'
import { formatLocalDate } from '../lib/utils'
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { Confetti } from '../components/Confetti'
import { approvedDaysEmojis } from '../components/approvedDaysEmojis';

interface AttendanceRecord {
  date: string
  status: 'pending' | 'approved' | 'rejected' | 'absent'
  timestamp: Date
}

interface FeeSummary {
  totalDays: number
  absentDays: number
  monthlyFee: number
  totalAmount: number
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    totalDays: 0,
    absentDays: 0,
    monthlyFee: 0,
    totalAmount: 0
  })
  const [loading, setLoading] = useState(false)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const isFirstLoad = useRef(true)
  const prevTodayStatus = useRef<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState<number>(0);
  const [hasMarkedAttendanceToday, setHasMarkedAttendanceToday] = useState(false);





  const loadAttendanceRecords = useCallback(async () => {
    if (!user?.uid) return
    
    setAttendanceLoading(true)
    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid),
        where('date', '>=', formatLocalDate(monthStart)),
        where('date', '<=', formatLocalDate(monthEnd))
      )
      
      const querySnapshot = await getDocs(q)
      const records: AttendanceRecord[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        records.push({
          date: data.date,
          status: data.status,
          timestamp: data.timestamp?.toDate() || new Date()
        })
      })
      
      setAttendanceRecords(records)
      // Check if attendance is already marked for today
      setHasMarkedAttendanceToday(records.some(record => record.date === formatLocalDate(new Date())));
    } catch (error) {
      toast.error('Failed to load attendance records. Please refresh the page and try again.')
    } finally {
      setAttendanceLoading(false)
    }
  }, [user?.uid, currentMonth])

  const loadFeeSummary = useCallback(async () => {
    if (!user?.uid) return
    
    setFeeSummaryLoading(true)
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const monthlyFee = userData.monthlyFee || 0
        
        // Get approved and absent attendance for current month view
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        
        const [approvedSnapshot, absentSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'attendance'),
            where('studentId', '==', user.uid),
            where('status', '==', 'approved'),
            where('date', '>=', formatLocalDate(monthStart)),
            where('date', '<=', formatLocalDate(monthEnd))
          )),
          getDocs(query(
            collection(db, 'attendance'),
            where('studentId', '==', user.uid),
            where('status', '==', 'absent'),
            where('date', '>=', formatLocalDate(monthStart)),
            where('date', '<=', formatLocalDate(monthEnd))
          ))
        ])
        
        const approvedDays = approvedSnapshot.size
        const absentDays = absentSnapshot.size
        
        // Calculate daily rate: monthly fee / total days in month
        const totalDaysInMonth = monthEnd.getDate()
        const dailyRate = monthlyFee > 0 ? monthlyFee / totalDaysInMonth : 0
        const totalAmount = approvedDays * dailyRate
        
        setFeeSummary({
          totalDays: approvedDays,
          absentDays,
          monthlyFee,
          totalAmount: Math.round(totalAmount * 100) / 100 // Round to 2 decimal places
        })
      }
    } catch (error) {
      toast.error('Failed to load fee summary. Please refresh the page and try again.')
    } finally {
      setFeeSummaryLoading(false)
    }
  }, [user?.uid, currentMonth])

  // Load initial data when user or month changes
  useEffect(() => {
    if (user?.uid) {
      loadAttendanceRecords()
      loadFeeSummary()
    }
  }, [user, currentMonth, loadAttendanceRecords, loadFeeSummary])

  // Refresh data every 30 seconds to catch updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.uid) {
        loadAttendanceRecords()
        loadFeeSummary()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [user?.uid, loadAttendanceRecords, loadFeeSummary])

  // Utility to get today's confetti key
  const getTodayConfettiKey = () => {
    const now = new Date();
    return `confetti_shown_${formatLocalDate(now)}`;
  };

  // Detect new approval for today only
  useEffect(() => {
    // Only run confetti logic if viewing the current month
    const now = new Date();
    const isCurrentMonth =
      currentMonth.getMonth() === now.getMonth() &&
      currentMonth.getFullYear() === now.getFullYear();
    if (!isCurrentMonth) return;
    const todayStr = formatLocalDate(now);
    const todayRecord = attendanceRecords.find(r => r.date === todayStr);
    const currentStatus = todayRecord?.status || null;
    const confettiKey = getTodayConfettiKey();
    const confettiAlreadyShown = localStorage.getItem(confettiKey) === 'true';
    // Only trigger confetti if status transitions from not approved to approved and not already shown
    if (
      prevTodayStatus.current !== 'approved' &&
      currentStatus === 'approved' &&
      !confettiAlreadyShown
    ) {
      if (!isFirstLoad.current) {
        setConfettiTrigger(Date.now());
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1500);
        localStorage.setItem(confettiKey, 'true');
      }
    }
    // Update previous status for next effect run
    prevTodayStatus.current = currentStatus;
    // Mark initial load as done
    if (isFirstLoad.current) isFirstLoad.current = false;
  }, [attendanceRecords, currentMonth]);

  const markAttendance = async () => {
    if (!user?.uid) return
    
    setLoading(true)
    try {
      const today = formatLocalDate(new Date())
      
      // Check if already marked today
      const existingRecord = attendanceRecords.find(record => record.date === today)
      if (existingRecord) {
        toast.error('Attendance already marked for today')
        return
      }
      
      // Create attendance record
      await setDoc(doc(db, 'attendance', `${user.uid}_${today}`), {
        studentId: user.uid,
        studentName: user.displayName || 'Unknown Student',
        date: today,
        status: 'pending',
        timestamp: new Date(),
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear()
      })
      
      // Reload records
      await loadAttendanceRecords()
      toast.success('Attendance marked successfully! Waiting for teacher approval.')
    } catch (error) {
      toast.error('Failed to mark attendance')
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const getAttendanceStatus = (day: number | null) => {
    if (!day) return null
    
    const dateStr = formatLocalDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
    const record = attendanceRecords.find(r => r.date === dateStr)
    return record?.status || null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'rejected': return 'bg-red-500'
      case 'absent': return 'bg-red-400'
      default: return 'bg-gray-200'
    }
  }

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  // Utility to get a deterministic random emoji for today
  const getTodayEmoji = () => {
    const today = new Date();
    const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = daySeed % approvedDaysEmojis.length;
    return approvedDaysEmojis[index];
  };

  // Emoji list for Approved Days card
  // Don't render if user is not available
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {showConfetti && <Confetti trigger={confettiTrigger} />}
      <Navigation title="Student Dashboard" />
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">

        {/* Quick Actions - Bento Design */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Large Attendance Card */}
          <Card className="md:col-span-2 transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Mark Attendance</CardTitle>
              <CardDescription>Mark today's attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={markAttendance}
                disabled={loading || hasMarkedAttendanceToday}
                className={`w-full ${hasMarkedAttendanceToday ? 'bg-gray-300 text-gray-500 border border-gray-400 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Marking...' : hasMarkedAttendanceToday ? 'Marked Today' : 'Mark Today'}
              </Button>
            </CardContent>
          </Card>

          {/* Medium Approved Days Card */}
          <Card className="md:col-span-2 transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Approved Days</CardTitle>
              <CardDescription>This month's approved attendance</CardDescription>
            </CardHeader>
            <CardContent>
              {feeSummaryLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between w-full">
                    <p className="text-4xl font-bold text-green-600">{feeSummary.totalDays}</p>
                    {(() => {
                      const emoji = getTodayEmoji();
                      return (
                        <img
                          key={emoji.name}
                          src={emoji.webp}
                          alt={emoji.alt}
                          title={emoji.name}
                          className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                          loading="lazy"
                        />
                      );
                    })()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feeSummary.totalDays === 1 ? 'day' : 'days'} approved
                  </p>
                </>
              )}
            </CardContent>
          </Card>



          {/* Small Daily Rate Card */}
          <Card className="md:col-span-1 transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-sm">Daily Rate</CardTitle>
              <CardDescription className="text-xs">Per day</CardDescription>
            </CardHeader>
            <CardContent>
              {feeSummaryLoading ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              ) : feeSummary.monthlyFee > 0 ? (
                <p className="text-2xl font-bold text-purple-600">
                  ₹{Math.round((feeSummary.monthlyFee / new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()) * 100) / 100}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No fee</p>
              )}
            </CardContent>
          </Card>

          {/* Small Total Due Card */}
          <Card className="md:col-span-1 transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-sm">Total Due</CardTitle>
              <CardDescription className="text-xs">Amount</CardDescription>
            </CardHeader>
            <CardContent>
              {feeSummaryLoading ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : feeSummary.monthlyFee > 0 ? (
                <p className="text-2xl font-bold text-blue-600">₹{feeSummary.totalAmount}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No fee</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Attendance Calendar</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeMonth('prev')}
                  className="transition-all duration-200"
                >
                  ←
                </Button>
                <span className="text-lg font-medium">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeMonth('next')}
                  className="transition-all duration-200"
                >
                  →
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading attendance calendar...</span>
              </div>
            ) : (
              <div className="w-full">
                <div className="grid grid-cols-7 gap-1 w-full">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-muted-foreground text-sm">
                    {day}
                  </div>
                ))}
                
                {getDaysInMonth().map((day, index) => {
                  const status = getAttendanceStatus(day)
                  return (
                    <div
                      key={index}
                      className={`relative p-1 sm:p-2 text-center border rounded-md min-h-[32px] sm:min-h-[40px] flex items-center justify-center transition-all duration-200 hover:z-10 ${
                        status ? getStatusColor(status) + ' text-white' : 'bg-gray-50'
                      }`}
                    >
                      {day && (
                        <>
                          <span className="font-medium select-none text-sm sm:text-base">{day}</span>
                          {status && (
                            <span className="pointer-events-none absolute bottom-1 right-1" title={status} aria-label={status}>
                              <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(status)}`}></span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
                </div>
              </div>
            )}
            
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Rejected</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
