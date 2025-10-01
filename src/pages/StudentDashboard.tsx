import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useAuth } from '../hooks/useAuth'
import Navigation from '../components/Navigation'
import { db } from '../firebase'
import { formatLocalDate } from '../lib/utils'
import { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { Confetti } from '../components/Confetti'
import { approvedDaysEmojis } from '../components/approvedDaysEmojis';
import { debouncedToast } from '../lib/debouncedToast';
import Footer from '../components/Footer';
import { Link as LinkIcon } from 'lucide-react'
import { linkGoogleAccount } from '../lib/linkGoogleAccount'
import { formatDistanceToNow, endOfMonth, differenceInDays } from 'date-fns'
import PaidBadge from '../components/PaidBadge';
import { CheckCircle } from 'lucide-react';
import DueDateBanner from '../components/DueDateBanner';
import { dispatchAttendanceUpdatedEvent } from '../lib/utils';

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
  const [totalDueAmount, setTotalDueAmount] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [paymentDate, setPaymentDate] = useState<Date | null>(null)
  const [previousMonthPaymentStatus, setPreviousMonthPaymentStatus] = useState<string | null>(null)
  const [shouldShowPlatformStartToast, setShouldShowPlatformStartToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastTotalDueUpdate, setLastTotalDueUpdate] = useState<Date | null>(null);
  const [monthlyDueDate, setMonthlyDueDate] = useState<Date | null>(null);

  const PLATFORM_START = new Date(import.meta.env.VITE_PLATFORM_START || '2025-08-01');

  const today = new Date();
  const daysUntilDue = monthlyDueDate ? differenceInDays(monthlyDueDate, today) : 0;

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
    } catch (error) {
      debouncedToast('Failed to load attendance records. Please refresh the page and try again.', 'error')
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
        await saveTotalDue(Math.round(totalAmount * 100) / 100)
      }
    } catch (error) {
      debouncedToast('Failed to load fee summary. Please refresh the page and try again.', 'error')
    } finally {
      setFeeSummaryLoading(false)
    }
  }, [user?.uid, currentMonth])

  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  const saveTotalDue = useCallback(async (amount: number) => {
    if (!user?.uid) return;
    try {
      const monthKey = getMonthKey(currentMonth);
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      let totalDueByMonth: { [key: string]: { due: number, status: string } } = {};
      if (userDoc.exists()) {
        // Accept both old and new formats for backward compatibility
        const raw = userDoc.data().totalDueByMonth || {};
        for (const key in raw) {
          if (typeof raw[key] === 'number') {
            totalDueByMonth[key] = { due: raw[key], status: 'unpaid' };
          } else {
            totalDueByMonth[key] = raw[key];
          }
        }
      }
      totalDueByMonth[monthKey] = { due: amount, status: totalDueByMonth[monthKey]?.status || 'unpaid' };
      await setDoc(userRef, {
        totalDueByMonth,
        lastTotalDueUpdate: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving total due amount:', error);
    }
  }, [user?.uid, currentMonth]);

  const loadTotalDue = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const monthKey = getMonthKey(currentMonth);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const raw = userDoc.data().totalDueByMonth || {};
        let due = 0;
        let status: string | null = null;
        let paidDate: Date | null = null;
        if (typeof raw[monthKey] === 'object' && raw[monthKey] !== null) {
          due = raw[monthKey].due;
          status = raw[monthKey].status || null;
          if (raw[monthKey].paymentDate) {
            paidDate = raw[monthKey].paymentDate.toDate ? raw[monthKey].paymentDate.toDate() : new Date(raw[monthKey].paymentDate);
          }
        } else if (typeof raw[monthKey] === 'number') {
          due = raw[monthKey];
        }
        setTotalDueAmount(due);
        setPaymentStatus(status);
        setPaymentDate(paidDate);
        const lastUpdate = userDoc.data().lastTotalDueUpdate;
        setLastTotalDueUpdate(lastUpdate ? (lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate)) : null);
      }
    } catch (error) {
      console.error('Error loading total due amount:', error);
    }
  }, [user?.uid, currentMonth]);

  const loadPreviousMonthPaymentStatus = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(currentMonth.getMonth() - 1);
      const previousMonthKey = getMonthKey(previousMonth);
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const raw = userDoc.data().totalDueByMonth || {};
        let previousStatus: string | null = null;
        
        if (typeof raw[previousMonthKey] === 'object' && raw[previousMonthKey] !== null) {
          previousStatus = raw[previousMonthKey].status || null;
        }
        
        setPreviousMonthPaymentStatus(previousStatus);
      }
    } catch (error) {
      console.error('Error loading previous month payment status:', error);
    }
  }, [user?.uid, currentMonth]);

  const calculateMonthlyDueDate = useCallback(() => {
    const dueDate = endOfMonth(currentMonth);
    setMonthlyDueDate(dueDate);
  }, [currentMonth]);

  // Load initial data when user or month changes
  useEffect(() => {
    if (user?.uid) {
      loadAttendanceRecords()
      loadFeeSummary()
      loadTotalDue()
      loadPreviousMonthPaymentStatus()
      calculateMonthlyDueDate();
    }
  }, [user, currentMonth, loadAttendanceRecords, loadFeeSummary, loadTotalDue, loadPreviousMonthPaymentStatus, calculateMonthlyDueDate])

  // Real-time listener for user document (fees, payment status, etc.)
  useEffect(() => {
    if (!user?.uid) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Update fee/payment state
        const raw = data.totalDueByMonth || {};
        const monthKey = getMonthKey(currentMonth);
        let due = 0;
        let status = null;
        let paidDate = null;
        if (typeof raw[monthKey] === 'object' && raw[monthKey] !== null) {
          due = raw[monthKey].due;
          status = raw[monthKey].status || null;
          if (raw[monthKey].paymentDate) {
            paidDate = raw[monthKey].paymentDate.toDate ? raw[monthKey].paymentDate.toDate() : new Date(raw[monthKey].paymentDate);
          }
        } else if (typeof raw[monthKey] === 'number') {
          due = raw[monthKey];
        }
        setTotalDueAmount(due);
        setPaymentStatus(status);
        setPaymentDate(paidDate);
        
        // Update previous month payment status
        const previousMonth = new Date(currentMonth);
        previousMonth.setMonth(currentMonth.getMonth() - 1);
        const previousMonthKey = getMonthKey(previousMonth);
        let previousStatus = null;
        if (typeof raw[previousMonthKey] === 'object' && raw[previousMonthKey] !== null) {
          previousStatus = raw[previousMonthKey].status || null;
        }
        setPreviousMonthPaymentStatus(previousStatus);
        
        const lastUpdate = data.lastTotalDueUpdate;
        setLastTotalDueUpdate(lastUpdate ? (lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate)) : null);
      }
    });
    return () => unsubscribe();
  }, [user?.uid, currentMonth]);

  // Real-time listener for attendance records
  useEffect(() => {
    if (!user?.uid) return;
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', user.uid),
      where('date', '>=', formatLocalDate(monthStart)),
      where('date', '<=', formatLocalDate(monthEnd))
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          date: data.date,
          status: data.status,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });
      setAttendanceRecords(records);
    });
    return () => unsubscribe();
  }, [user?.uid, currentMonth]);
  
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
    const prevStatus = prevTodayStatus.current;

    // Skip confetti logic on first load
    if (isFirstLoad.current) {
      prevTodayStatus.current = currentStatus;
      isFirstLoad.current = false;
      return;
    }

    // Only trigger confetti if status transitions from not approved to approved and not already shown
    const isFirstApproval =
      (prevStatus === 'pending' || prevStatus === 'absent' || prevStatus === 'rejected' || prevStatus === null) &&
      currentStatus === 'approved' &&
      !confettiAlreadyShown;
    if (isFirstApproval) {
      setConfettiTrigger(Date.now());
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1500);
      localStorage.setItem(confettiKey, 'true');
    }
    // Update previous status for next effect run
    prevTodayStatus.current = currentStatus;
  }, [attendanceRecords, currentMonth]);

  const markAttendance = async () => {
    if (!user?.uid) return
    
    setLoading(true)
    setFeeSummaryLoading(true); // Show loader immediately
    try {
      const today = formatLocalDate(new Date())
      
      // Check if already marked today
      const existingRecord = attendanceRecords.find(record => record.date === today)
      if (existingRecord) {
        debouncedToast('Attendance already marked for today', 'error')
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
      
      // Reload records and due
      await loadAttendanceRecords()
      await loadFeeSummary()
      await loadTotalDue()
      dispatchAttendanceUpdatedEvent();
      debouncedToast('Attendance marked successfully! Waiting for teacher approval.', 'success')
    } catch (error) {
      debouncedToast('Failed to mark attendance', 'error')
    } finally {
      setLoading(false)
      setFeeSummaryLoading(false); // Hide loader after data is fetched
    }
  }

  // Memoize days array for calendar
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [currentMonth]);

  // Memoize hasMarkedAttendanceToday
  const memoHasMarkedAttendanceToday = useMemo(() => {
    return attendanceRecords.some(record => record.date === formatLocalDate(new Date()));
  }, [attendanceRecords]);

  // Memoize getAttendanceStatus
  const getAttendanceStatus = useCallback((day: number | null) => {
    if (!day) return null;
    const dateStr = formatLocalDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    const record = attendanceRecords.find(r => r.date === dateStr);
    return record?.status || null;
  }, [attendanceRecords, currentMonth]);

  // Memoize getStatusColor
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'absent': return 'bg-red-400';
      default: return 'bg-gray-200';
    }
  }, []);

  // Memoize changeMonth
  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      if (newMonth < PLATFORM_START) {
        setShouldShowPlatformStartToast(true);
        return new Date();
      }
      return newMonth;
    });
  }, [PLATFORM_START]);

  // Memoize handleRefresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAttendanceRecords();
      await loadFeeSummary();
      await loadTotalDue();
      await loadPreviousMonthPaymentStatus();
    } finally {
      setRefreshing(false);
    }
  }, [loadAttendanceRecords, loadFeeSummary, loadTotalDue, loadPreviousMonthPaymentStatus]);

  useEffect(() => {
    if (shouldShowPlatformStartToast) {
      debouncedToast('Started using platform from August 2025', 'error');
      setShouldShowPlatformStartToast(false);
    }
  }, [shouldShowPlatformStartToast]);

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

  const providerData = user?.providerData || [];
  const isGoogleLinked = providerData.some((provider: any) => provider.providerId === 'google.com');

  const now = new Date();
  const isCurrentMonth =
    currentMonth.getMonth() === now.getMonth() &&
    currentMonth.getFullYear() === now.getFullYear();
  const isPastMonth =
    currentMonth.getFullYear() < now.getFullYear() ||
    (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() < now.getMonth());
  const isFutureMonth =
    currentMonth.getFullYear() > now.getFullYear() ||
    (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() > now.getMonth());

  return (
    <div className="min-h-screen bg-background">
      {showConfetti && <Confetti trigger={confettiTrigger} />}
      <Navigation onRefresh={handleRefresh} refreshing={refreshing} />
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Updated X ago info */}
          <div className="flex items-center gap-2 mb-2" title={lastTotalDueUpdate ? lastTotalDueUpdate.toLocaleString() : ''}>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span className="text-sm font-medium text-muted-foreground">
              {lastTotalDueUpdate ? `Updated ${formatDistanceToNow(lastTotalDueUpdate)} ago` : 'Loading...'}
            </span>
          </div>
          {/* Due Date Reminder Banner */}
          {monthlyDueDate && isCurrentMonth && daysUntilDue <= 5 && daysUntilDue >= 0 && paymentStatus !== 'paid' && (
            <DueDateBanner 
              dueDate={monthlyDueDate} 
              daysUntilDue={daysUntilDue} 
              paymentStatus={paymentStatus} 
              currentMonth={currentMonth}
              totalDueAmount={totalDueAmount}
            />
          )}
          {/* Account Settings Card for Google Link */}
          {!isGoogleLinked && (
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
          {/* Dashboard Header (no refresh button here anymore) */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          </div>
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
                disabled={loading || memoHasMarkedAttendanceToday || !isCurrentMonth}
                className={`w-full ${memoHasMarkedAttendanceToday || !isCurrentMonth ? 'bg-gray-300 text-gray-500 border border-gray-400 cursor-not-allowed' : ''}`}
              >
                {loading
                  ? 'Marking...'
                  : memoHasMarkedAttendanceToday
                    ? 'Marked Today'
                    : isPastMonth
                      ? 'Disabled for Past months'
                      : isFutureMonth
                        ? 'Disabled for Future months'
                        : 'Mark Today'}
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
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-green-600 leading-none">{feeSummary.totalDays}</span>
                      <span className="text-base text-muted-foreground mb-1">
                        {feeSummary.totalDays === 1 ? 'day approved' : 'days approved'}
                      </span>
                    </div>
                    {(() => {
                      const emoji = getTodayEmoji();
                      return (
                        <img
                          key={emoji.name}
                          src={emoji.webp}
                          alt={emoji.alt}
                          title={emoji.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                          loading="lazy"
                        />
                      );
                    })()}
                  </div>
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
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm">Total Due</CardTitle>
                {paymentStatus === 'paid' && <PaidBadge paymentDate={paymentDate} />}
              </div>
              <CardDescription className="text-xs">Amount</CardDescription>
            </CardHeader>
            <CardContent>
              {feeSummaryLoading ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : feeSummary.monthlyFee > 0 ? (
                <div className="flex items-center justify-between w-full">
                  <p className="text-2xl font-bold text-blue-600">₹{totalDueAmount}</p>
                  {paymentStatus === 'paid' && (
                    <CheckCircle className="text-green-500" size={22} aria-label="Paid" />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fee</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calendar - hidden on mobile, visible on sm+ */}
        <Card className="hidden sm:block">
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
            {currentMonth < PLATFORM_START ? (
              <div className="text-center text-red-600 font-semibold py-8">
                Started using platform from August 2025
              </div>
            ) : (
              <>
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
                    {daysInMonth.map((day, index) => {
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
              </>
            )}
          </CardContent>
        </Card>
        {/* Alternative content for mobile */}
        <Card className="sm:hidden">
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              Calendar view is available on larger screens.
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
