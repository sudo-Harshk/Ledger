import { useState, useEffect } from 'react';
import { doc, onSnapshot, type DocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';

interface FinancialSummary {
  revenue: number;
  lastUpdated: any;
}

export const useFinancialSummary = (userUid: string | undefined, currentMonth: Date) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid) return;
    
    setLoading(true);
    const monthYear = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    const summaryDocRef = doc(db, 'users', userUid, 'monthlySummaries', monthYear);
    
    const unsubscribe = onSnapshot(summaryDocRef, 
      (docSnapshot: DocumentSnapshot<DocumentData>) => {
        try {
          if (docSnapshot.exists()) {
            setFinancialSummary({
              revenue: docSnapshot.data().revenue || 0,
              lastUpdated: docSnapshot.data().lastUpdated || null,
            });
          } else {
            setFinancialSummary(null);
          }
          setLoading(false);
        } catch (error) {
          console.error('Error processing financial summary:', error);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error in financial summary listener:', error);
        setLoading(false);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from financial summary:', error);
      }
    };
  }, [userUid, currentMonth]);

  return {
    financialSummary,
    loading
  };
};
