import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { debouncedToast } from '@/lib';

export const useMonthlyFee = (userUid: string | undefined) => {
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  // Fetch monthly fee
  const fetchMonthlyFee = async () => {
    if (!userUid) return 0;
    try {
      const userDoc = await getDoc(doc(db, 'users', userUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setMonthlyFee(data.monthlyFee || 0);
        return data.monthlyFee || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching monthly fee:', error);
      return 0;
    }
  };

  // Update monthly fee
  const updateMonthlyFee = async (newFee: number) => {
    if (!userUid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userUid), {
        monthlyFee: newFee
      });
      
      // Update all students' monthly fee
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const batch = writeBatch(db);
      studentsSnapshot.docs.forEach((studentDoc) => {
        batch.update(studentDoc.ref, { monthlyFee: newFee });
      });
      await batch.commit();
      
      setMonthlyFee(newFee);
      debouncedToast('Monthly fee updated successfully!', 'success');
      setIsUpdated(true);
      setTimeout(() => setIsUpdated(false), 500);
    } catch (error) {
      console.error('Error updating monthly fee:', error);
      debouncedToast('Failed to update monthly fee', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (userUid) {
      fetchMonthlyFee();
    }
  }, [userUid]);

  return {
    monthlyFee,
    loading,
    isUpdated,
    updateMonthlyFee,
    fetchMonthlyFee
  };
};
