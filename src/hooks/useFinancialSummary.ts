import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc, Timestamp, type DocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';

interface FinancialSummary {
  revenue: number;
  lastUpdated: any;
}

export const useFinancialSummary = (userUid: string | undefined, currentMonth: Date, refreshTrigger?: number) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid) return;
    
    setLoading(true);
    const monthYear = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    const summaryDocRef = doc(db, 'users', userUid, 'monthlySummaries', monthYear);
    
    // If refreshTrigger is provided, force a fresh fetch and update timestamp
    if (refreshTrigger !== undefined) {
      getDoc(summaryDocRef).then(async (docSnapshot: DocumentSnapshot<DocumentData>) => {
        try {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const currentTime = Timestamp.now();
            
            // Update the lastUpdated timestamp in the database
            await setDoc(summaryDocRef, {
              revenue: data.revenue || 0,
              lastUpdated: currentTime,
            }, { merge: true });
            
            setFinancialSummary({
              revenue: data.revenue || 0,
              lastUpdated: currentTime,
            });
          } else {
            setFinancialSummary(null);
          }
          setLoading(false);
        } catch (error) {
          console.error('Error processing financial summary:', error);
          setLoading(false);
        }
      }).catch((error) => {
        console.error('Error fetching financial summary:', error);
        setLoading(false);
      });
    } else {
      // Use real-time listener for normal operation
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
    }
  }, [userUid, currentMonth, refreshTrigger]);

  return {
    financialSummary,
    loading
  };
};
