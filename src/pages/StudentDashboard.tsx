import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { auth } from '@/firebase';
import StudentLinkedAccountsModal from '@/components/StudentLinkedAccountsModal';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useAuth } from '@/hooks';
import { Navigation, Footer, Confetti, DueDateBanner, PaidBadge, approvedDaysEmojis } from '@/components';
import { db } from '@/firebase';
import { formatLocalDate, debouncedToast, linkGoogleAccount, dispatchAttendanceUpdatedEvent } from '@/lib';
import { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { Link as LinkIcon, CheckCircle } from 'lucide-react';

// --- Types ---
interface AttendanceRecord {
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'absent';
  timestamp: Date;
}

interface FeeSummary {
  totalDays: number;
  absentDays: number;
  monthlyFee: number;
  totalAmount: number;
}

// --- Card Skeleton ---
const CardSkeleton: React.FC<{ description?: string; height?: number; className?: string }> = ({ description, height = 80, className }) => (
  <Card className={`animate-pulse ${className || ''}`}>
    <CardHeader>
      <CardTitle>
        <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
      </CardTitle>
      {description && <CardDescription>
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </CardDescription>}
    </CardHeader>
    <CardContent>
      <div className={`bg-gray-200 rounded w-full`} style={{ height, minHeight: height }} />
    </CardContent>
  </Card>
);

// --- Extracted Card Components ---
type ApprovedDaysCardProps = {
  feeSummaryLoading: boolean;
  feeSummary: FeeSummary;
  getTodayEmoji: () => { name: string; emoji: string; webp: string; alt: string };
};
const ApprovedDaysCard: React.FC<ApprovedDaysCardProps> = React.memo(({ feeSummaryLoading, feeSummary, getTodayEmoji }) => (
  feeSummaryLoading ? (
    <CardSkeleton description="This month's approved attendance" height={80} className="md:col-span-2 min-h-[160px]" />
  ) : (
    <Card className="md:col-span-2 min-h-[160px] transition-all duration-200 bg-card-elevated shadow-lg border border-palette-golden/30">
      <CardHeader>
        <CardTitle className="text-lg">Approved Days</CardTitle>
        <CardDescription>This month's approved attendance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-palette-golden leading-none">{feeSummary.totalDays}</span>
            <span className="text-base text-palette-dark-teal mb-1">
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
      </CardContent>
    </Card>
  )
));

type DailyRateCardProps = {
  feeSummaryLoading: boolean;
  feeSummary: FeeSummary;
  currentMonth: Date;
};
const DailyRateCard: React.FC<DailyRateCardProps> = React.memo(({ feeSummaryLoading, feeSummary, currentMonth }) => (
  feeSummaryLoading ? (
    <CardSkeleton description="Per day" height={40} className="md:col-span-1 min-h-[120px]" />
  ) : (
    <Card className="md:col-span-1 min-h-[120px] transition-all duration-200 bg-card-elevated shadow-lg border border-palette-golden/30">
      <CardHeader>
        <CardTitle className="text-sm">Daily Rate</CardTitle>
        <CardDescription className="text-xs">Per day</CardDescription>
      </CardHeader>
      <CardContent>
        {feeSummary.monthlyFee > 0 ? (
          <p className="text-2xl font-bold text-palette-deep-red">
            ₹{Math.round((feeSummary.monthlyFee / new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()) * 100) / 100}
          </p>
        ) : (
          <p className="text-sm text-palette-dark-teal">No fee</p>
        )}
      </CardContent>
    </Card>
  )
));

type TotalDueCardProps = {
  feeSummaryLoading: boolean;
  feeSummary: FeeSummary;
  totalDueAmount: number;
  paymentStatus: string | null;
  paymentDate: Date | null;
};
const TotalDueCard: React.FC<TotalDueCardProps> = React.memo(({ feeSummaryLoading, feeSummary, totalDueAmount, paymentStatus, paymentDate }) => (
  feeSummaryLoading ? (
    <CardSkeleton description="Amount" height={40} className="md:col-span-1 min-h-[120px]" />
  ) : (
    <Card className="md:col-span-1 min-h-[120px] transition-all duration-200 bg-card-elevated shadow-lg border border-palette-golden/30">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-sm">Total Due</CardTitle>
          {paymentStatus === 'paid' && <PaidBadge paymentDate={paymentDate} />}
        </div>
        <CardDescription className="text-xs">Amount</CardDescription>
      </CardHeader>
      <CardContent>
        {feeSummary.monthlyFee > 0 ? (
          <div className="flex items-center justify-between w-full">
            <p className="text-2xl font-bold text-palette-deep-red">₹{totalDueAmount}</p>
            {paymentStatus === 'paid' && (
              <CheckCircle className="text-green-500" size={22} aria-label="Paid" />
            )}
          </div>
        ) : (
          <p className="text-sm text-palette-dark-teal">No fee</p>
        )}
      </CardContent>
    </Card>
  )
));

// --- Main Dashboard ---

export default function StudentDashboard() {
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    totalDays: 0,
    absentDays: 0,
    monthlyFee: 0,
    totalAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const isFirstLoad = useRef(true);
  const prevTodayStatus = useRef<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState<number>(0);
  const [totalDueAmount, setTotalDueAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [shouldShowPlatformStartToast, setShouldShowPlatformStartToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastTotalDueUpdate, setLastTotalDueUpdate] = useState<Date | null>(null);
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null);
  const [monthlyDueDate] = useState<Date | null>(null);
  const [isStudentActive, setIsStudentActive] = useState<boolean>(user?.isActive !== false);

  // Memoized providerData and month checks
  const providerData = useMemo(() => user?.providerData || [], [user]);
  
  // Update isStudentActive when user changes
  useEffect(() => {
    if (user?.isActive !== undefined) {
      setIsStudentActive(user.isActive !== false);
    }
  }, [user?.isActive]);
  const isGoogleLinked = useMemo(() => providerData.some((provider) => provider.providerId === 'google.com'), [providerData]);
  const isGitHubLinked = useMemo(() => providerData.some((provider) => provider.providerId === 'github.com'), [providerData]);
  const now = useMemo(() => new Date(), []);
  const isCurrentMonth = useMemo(() => currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear(), [currentMonth, now]);
  const isPastMonth = useMemo(() => currentMonth.getFullYear() < now.getFullYear() || (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() < now.getMonth()), [currentMonth, now]);
  const isFutureMonth = useMemo(() => currentMonth.getFullYear() > now.getFullYear() || (currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() > now.getMonth()), [currentMonth, now]);

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

        // Always fetch real-time attendance data for accurate display
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
        });
      }
    } catch (error) {
      console.error('Error loading fee summary:', error)
      debouncedToast('Failed to load fee summary. Please refresh the page and try again.', 'error')
    } finally {
      setFeeSummaryLoading(false)
    }
  }, [user?.uid, currentMonth])

  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }


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

  // Load initial data when user or month changes
  useEffect(() => {
    if (user?.uid) {
      Promise.all([
        loadAttendanceRecords(),
        loadFeeSummary(),
        loadTotalDue()
      ]).then(() => {
        setLastDataRefresh(new Date());
      }).catch((error) => {
        console.error('Error loading initial data:', error);
      });
    }
  }, [user, currentMonth, loadAttendanceRecords, loadFeeSummary, loadTotalDue])

  // Real-time listener for user document (fees, payment status, etc.)
  useEffect(() => {
    if (!user?.uid) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Update student active status
        setIsStudentActive(data.isActive !== false); // Default to true if undefined, only false if explicitly false
        
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
        
        const lastUpdate = data.lastTotalDueUpdate;
        setLastTotalDueUpdate(lastUpdate ? (lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate)) : null);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        return;
      }
      console.error('Error in user document listener:', error);
    });
    return () => unsubscribe();
  }, [user?.uid, currentMonth]);

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
      
      // Update fee summary when attendance changes
      const approvedDays = records.filter(r => r.status === 'approved').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      
      setFeeSummary(prev => ({
        ...prev,
        totalDays: approvedDays,
        absentDays: absentDays,
        totalAmount: prev.monthlyFee > 0 ? 
          Math.round((approvedDays * (prev.monthlyFee / monthEnd.getDate())) * 100) / 100 : 0
      }));
    }, (error) => {
      // Silently handle permission errors (e.g., when user logs out)
      if (error.code === 'permission-denied') {
        return;
      }
      console.error('Error in attendance listener:', error);
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
    
    // Check if student is active
    if (!isStudentActive) {
      debouncedToast('Cannot mark attendance: Your account has been marked as discontinued. Please contact your teacher to reactivate your account.', 'error')
      return
    }
    
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
      console.error('Error marking attendance:', error);
      // Check if error is due to permission (inactive student or other permission issues)
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'permission-denied') {
          // Double-check student status for better error message
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.isActive === false) {
                debouncedToast('⚠️ Cannot mark attendance: Your account has been marked as discontinued. Please contact your teacher to reactivate your account.', 'error');
                setIsStudentActive(false); // Update state immediately
                return;
              }
            }
          } catch (checkError) {
            console.error('Error checking student status:', checkError);
          }
          debouncedToast('Permission denied: Unable to mark attendance. Please contact your teacher if this issue persists.', 'error');
        } else if (error.code === 'unavailable') {
          debouncedToast('Network error: Please check your connection and try again.', 'error');
        } else {
          debouncedToast(`Failed to mark attendance: ${error.code}. Please try again.`, 'error');
        }
      } else {
        debouncedToast('Failed to mark attendance. Please try again.', 'error');
      }
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
      // Force refresh all data by calling all load functions in parallel
      await Promise.all([
        loadAttendanceRecords(),
        loadFeeSummary(),
        loadTotalDue()
      ]);
      setLastDataRefresh(new Date());
      debouncedToast('Data refreshed successfully!', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      debouncedToast('Failed to refresh data. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [loadAttendanceRecords, loadFeeSummary, loadTotalDue]);

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

  return (
    <div className="min-h-screen bg-palette-light-cream flex flex-col">
      {showConfetti && <Confetti trigger={confettiTrigger} />}
      <Navigation onRefresh={handleRefresh} refreshing={refreshing} />
      <main className="flex-grow">
        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Updated X ago info */}
            <div className="flex items-center gap-2 mb-2" title={lastDataRefresh ? lastDataRefresh.toLocaleString() : (lastTotalDueUpdate ? lastTotalDueUpdate.toLocaleString() : '')}>
              <svg className="w-4 h-4 text-palette-dark-teal" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span className="text-sm font-medium text-palette-dark-teal">
                {lastDataRefresh ? `Updated ${formatDistanceToNow(lastDataRefresh)} ago` : 
                 lastTotalDueUpdate ? `Updated ${formatDistanceToNow(lastTotalDueUpdate)} ago` : 'Loading...'}
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
            {/* Dashboard Header with Settings */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-palette-dark-red">Dashboard</h2>
              <div className="flex items-center gap-2">
                {!isGitHubLinked && (
                  <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                    Settings
                  </Button>
                )}
              </div>
            </div>
            {/* Quick Actions - Bento Design */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Large Attendance Card */}
            <Card className="md:col-span-2 transition-all duration-200 bg-card-elevated shadow-lg border border-palette-golden/30">
              <CardHeader>
                <CardTitle className="text-lg">Mark Attendance</CardTitle>
                <CardDescription>
                  {!isStudentActive 
                    ? 'Your account has been discontinued. Contact your teacher to reactivate.'
                    : 'Mark today\'s attendance'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isStudentActive ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium mb-2">Account Discontinued</p>
                    <p className="text-xs text-orange-700">
                      You cannot mark attendance while your account is discontinued. Please contact your teacher to reactivate your account.
                    </p>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Medium Approved Days Card */}
            <ApprovedDaysCard feeSummaryLoading={feeSummaryLoading} feeSummary={feeSummary} getTodayEmoji={getTodayEmoji} />


            {/* Small Daily Rate Card */}
            <DailyRateCard feeSummaryLoading={feeSummaryLoading} feeSummary={feeSummary} currentMonth={currentMonth} />

            {/* Small Total Due Card */}
            <TotalDueCard feeSummaryLoading={feeSummaryLoading} feeSummary={feeSummary} totalDueAmount={totalDueAmount} paymentStatus={paymentStatus} paymentDate={paymentDate} />
          </div>

          {/* Calendar - hidden on mobile, visible on sm+ */}
          <Card className="hidden sm:block bg-card-elevated shadow-lg border border-palette-golden/30">
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
                <div className="text-center text-palette-deep-red font-semibold py-8">
                  Started using platform from August 2025
                </div>
              ) : (
                <>
                  {attendanceLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-palette-dark-teal">Loading attendance calendar...</span>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="grid grid-cols-7 gap-1 w-full">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-2 text-center font-medium text-palette-dark-teal text-sm">
                          {day}
                        </div>
                      ))}
                      {daysInMonth.map((day, index) => {
                        const status = getAttendanceStatus(day)
                        return (
                          <div
                            key={index}
                            className={`relative p-1 sm:p-2 text-center border border-palette-golden/30 rounded-md min-h-[32px] sm:min-h-[40px] flex items-center justify-center transition-all duration-200 hover:z-10 ${
                              status ? getStatusColor(status) + ' text-white' : 'bg-card-base'
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
          <Card className="sm:hidden bg-card-elevated shadow-lg border border-palette-golden/30">
            <CardContent>
              <div className="text-center text-palette-dark-teal py-8">
                Calendar view is available on larger screens.
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
      <Footer />
      <StudentLinkedAccountsModal 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        isGitHubLinked={isGitHubLinked}
        onAfterLink={async () => {
          // Ensure latest providerData so modal updates and button disappears
          if (auth.currentUser?.reload) {
            await auth.currentUser.reload();
          }
        }}
      />
    </div>
  )
}
