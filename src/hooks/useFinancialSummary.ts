import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc, Timestamp, type DocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import type { FinancialSummary } from '@/types';

export const useFinancialSummary = (userUid: string | undefined, currentMonth: Date, refreshTrigger?: number) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid) return;
    
    let isMounted = true;
    setLoading(true);
    const monthYear = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
    const summaryDocRef = doc(db, 'users', userUid, 'monthlySummaries', monthYear);
    
    // If refreshTrigger is provided, force a fresh fetch and update timestamp
    if (refreshTrigger !== undefined) {
      getDoc(summaryDocRef).then(async (docSnapshot: DocumentSnapshot<DocumentData>) => {
        if (!isMounted) return;
        
        try {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const currentTime = Timestamp.now();
            
            // Update the lastUpdated timestamp in the database
            await setDoc(summaryDocRef, {
              revenue: data.revenue || 0,
              lastUpdated: currentTime,
            }, { merge: true });
            
            if (isMounted) {
              setFinancialSummary({
                revenue: data.revenue || 0,
                lastUpdated: currentTime,
              });
            }
          } else {
            if (isMounted) {
              setFinancialSummary(null);
            }
          }
          if (isMounted) {
            setLoading(false);
          }
        } catch (error) {
          console.error('Error processing financial summary:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      }).catch((error) => {
        console.error('Error fetching financial summary:', error);
        if (isMounted) {
          setLoading(false);
        }
      });
    } else {
      // Use real-time listener for normal operation
      const unsubscribe = onSnapshot(summaryDocRef, 
        (docSnapshot: DocumentSnapshot<DocumentData>) => {
          if (!isMounted) return;
          
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
          // Silently handle permission errors (e.g., when user logs out)
          if (error.code === 'permission-denied') {
            if (isMounted) {
              setLoading(false);
            }
            return;
          }
          console.error('Error in financial summary listener:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      );

      return () => {
        isMounted = false;
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from financial summary:', error);
        }
      };
    }
    
    // Cleanup function for refreshTrigger case
    return () => {
      isMounted = false;
    };
  }, [userUid, currentMonth, refreshTrigger]);

  return {
    financialSummary,
    loading
  };
};
