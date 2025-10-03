import { useState, useRef, useCallback, useMemo } from 'react';
import { debouncedToast } from '@/lib';

export const useCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on component unmount
  const cleanup = useCallback(() => {
    if (monthChangeTimeoutRef.current) {
      clearTimeout(monthChangeTimeoutRef.current);
    }
  }, []);

  // Calendar helpers
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth]);

  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    if (monthChangeTimeoutRef.current) {
      clearTimeout(monthChangeTimeoutRef.current);
    }
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      const PLATFORM_START = new Date(import.meta.env.VITE_PLATFORM_START || '2025-08-01');
      if (newMonth < PLATFORM_START && prev >= PLATFORM_START) {
        debouncedToast('Started using platform from August 2025', 'error');
        return new Date();
      }
      if (newMonth < PLATFORM_START) {
        return new Date();
      }
      return newMonth;
    });
  }, []);

  return {
    currentMonth,
    setCurrentMonth,
    daysInMonth,
    changeMonth,
    cleanup
  };
};
