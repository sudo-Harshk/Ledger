import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  limitToLast,
  type DocumentSnapshot
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { db, auth } from '@/firebase';
import { debouncedToast } from '@/lib';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import type { StudentAccount } from '@/types';

export const useStudents = () => {
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [lastVisibleStudent, setLastVisibleStudent] = useState<DocumentSnapshot | null>(null);
  const [firstVisibleStudent, setFirstVisibleStudent] = useState<DocumentSnapshot | null>(null);
  const [pageSize] = useState(10);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Initial fetch function (separate from pagination)
  const initialFetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        orderBy('createdAt'),
        limit(pageSize)
      );
      const snapshot = await getDocs(studentsQuery);
      const studentsList = snapshot.docs.map(doc => ({ ...(doc.data() as StudentAccount), id: doc.id }));
      setStudents(studentsList);
      setFirstVisibleStudent(snapshot.docs[0]);
      setLastVisibleStudent(snapshot.docs[snapshot.docs.length - 1]);
    } catch (error) {
      console.error('useStudents error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to fetch students. Please try again.');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [pageSize]);

  // Automatically fetch students when hook is initialized
  useEffect(() => {
    initialFetchStudents();
  }, []); // Remove initialFetchStudents from dependencies to prevent infinite loops

  // Fetch paginated students
  const fetchStudentsPage = useCallback(async (direction: 'next' | 'prev') => {
    setLoadingStudents(true);
    try {
      let studentsQuery;
      
      if (direction === 'next' && lastVisibleStudent) {
        studentsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          orderBy('createdAt'),
          startAfter(lastVisibleStudent),
          limit(pageSize)
        );
      } else if (direction === 'prev' && firstVisibleStudent) {
        studentsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          orderBy('createdAt'),
          endBefore(firstVisibleStudent),
          limitToLast(pageSize)
        );
      } else {
        // Fallback to initial fetch
        return await initialFetchStudents();
      }

      const snapshot = await getDocs(studentsQuery);
      if (!snapshot.empty) {
        const studentsList = snapshot.docs.map(doc => ({ ...(doc.data() as StudentAccount), id: doc.id }));
        setStudents(studentsList);
        setFirstVisibleStudent(snapshot.docs[0]);
        setLastVisibleStudent(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching students page:', error);
      toast.error('Failed to fetch students. Please try again.');
    } finally {
      setLoadingStudents(false);
    }
  }, [lastVisibleStudent, firstVisibleStudent, pageSize, initialFetchStudents]);

  // Refetch students (used after creating/deleting)
  const refetchStudents = async () => {
    try {
      await initialFetchStudents();
    } catch (error) {
      console.error('Error refetching students:', error);
      toast.error('Failed to refresh students list.');
    }
  };

  // Create student account
  const createStudentAccount = async (
    newStudentUsername: string,
    newStudentName: string,
    newStudentEmail: string,
    newStudentPassword: string,
    newStudentMonthlyFee: number,
    userUid: string
  ) => {
    if (!newStudentUsername || !newStudentName || !newStudentEmail || !newStudentPassword) {
      debouncedToast('Please fill in all fields', 'error');
      return;
    }
    if (newStudentUsername.length < 3) {
      debouncedToast('Username must be at least 3 characters long', 'error');
      return;
    }
    if (newStudentUsername.length > 50) {
      debouncedToast('Username must be less than 50 characters long', 'error');
      return;
    }
    if (newStudentPassword.length < 6) {
      debouncedToast('Password must be at least 6 characters long', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentEmail)) {
      debouncedToast('Please enter a valid email address', 'error');
      return;
    }

    // Check if username already exists
    const existingStudentsQuery = query(
      collection(db, 'users'), 
      where('username', '==', newStudentUsername),
      where('role', '==', 'student')
    );
    const existingStudents = await getDocs(existingStudentsQuery);
    if (!existingStudents.empty) {
      debouncedToast(`Username "${newStudentUsername}" is already taken. Please choose a different username.`, 'error');
      return;
    }

    // Check if email already exists
    const existingEmailQuery = query(
      collection(db, 'users'), 
      where('email', '==', newStudentEmail)
    );
    const existingEmail = await getDocs(existingEmailQuery);
    if (!existingEmail.empty) {
      debouncedToast(`Email "${newStudentEmail}" is already in use. Please choose a different email.`, 'error');
      return;
    }

    setCreateUserLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth, 
        newStudentEmail, 
        newStudentPassword
      );
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        username: newStudentUsername,
        email: newStudentEmail,
        role: 'student',
        displayName: newStudentName,
        monthlyFee: newStudentMonthlyFee,
        createdAt: new Date(),
        createdBy: userUid,
        isActive: true // New students are active by default
      });
      await refetchStudents();
      debouncedToast(`Student account created successfully! Username: ${newStudentUsername}`, 'success');
      return true; // Success
    } catch (error: unknown) {
      console.error('Error creating student account:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        debouncedToast('Email is already in use. Please choose a different email.', 'error');
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/weak-password') {
        debouncedToast('Password is too weak. Please use a stronger password (at least 6 characters).', 'error');
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/invalid-email') {
        debouncedToast('Please enter a valid email address.', 'error');
      } else if (error instanceof Error) {
        debouncedToast(`Failed to create account: ${error.message}`, 'error');
      } else {
        debouncedToast('Failed to create account. Please try again.', 'error');
      }
      // If Firebase Auth user was created but Firestore write failed, clean up
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
          logger.info('Successfully cleaned up Firebase Auth user after failed account creation');
        } catch (deleteError) {
          logger.error('Error cleaning up Firebase Auth user:', deleteError);
          // Log this as a critical issue that needs manual intervention
          console.error('CRITICAL: Failed to clean up Firebase Auth user. Manual cleanup required in Firebase Console.');
        }
      }
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Toggle student active status (mark as discontinued/reactivate)
  const toggleStudentActiveStatus = async (studentId: string, studentName: string, currentStatus: boolean | undefined) => {
    const newStatus = currentStatus === false; // Toggle: if inactive, make active; if active (or undefined), make inactive
    const action = newStatus ? 'reactivated' : 'discontinued';
    
    // Show confirmation dialog
    if (!newStatus) {
      // Deactivating
      if (!window.confirm(`Are you sure you want to mark ${studentName} as discontinued?\n\nThis will:\n• Stop analytics and fee calculations for this student\n• Preserve all attendance records and history\n• The student account and data will remain intact\n• You can reactivate them later if needed`)) {
        return;
      }
    } else {
      // Reactivating
      if (!window.confirm(`Reactivate ${studentName}?\n\nThis will:\n• Resume analytics and fee calculations\n• Include them in bulk attendance operations\n• All historical data will be preserved and accessible\n• Analytics will continue from where they left off`)) {
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'users', studentId), {
        isActive: newStatus
      });
      
      if (newStatus) {
        debouncedToast(`Student ${studentName} has been reactivated successfully! Analytics and fee calculations will resume.`, 'success');
      } else {
        debouncedToast(`Student ${studentName} has been marked as discontinued. All data is preserved and can be reactivated anytime.`, 'success');
      }
      
      await refetchStudents();
      // Dispatch event to refresh dashboard - this will trigger all components to refresh
      window.dispatchEvent(new CustomEvent('student-updated'));
      // Also trigger attendance and fee updates
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('fee-updated'));
    } catch (error: unknown) {
      console.error('Error toggling student active status:', error);
      if (error instanceof Error) {
        debouncedToast(`Failed to ${action} student: ${error.message}`, 'error');
      } else {
        debouncedToast(`Failed to ${action} student. Please try again.`, 'error');
      }
    }
  };

  // Delete student account
  const deleteStudentAccount = async (studentId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete student account for ${username}?\n\nThis will:\n• Delete their login credentials\n• Remove all attendance records\n• Delete their fee information\n• This action cannot be undone!`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', studentId));

      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(attendanceRef, where('studentId', '==', studentId));
      const attendanceSnapshot = await getDocs(attendanceQuery);

      const batch = writeBatch(db);
      attendanceSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      debouncedToast(`Student account for ${username} deleted successfully!\n\nNote: The Firebase Auth user account still exists and needs to be manually removed from Firebase Console for complete cleanup.`, 'success');
      await refetchStudents();
    } catch (error: unknown) {
      console.error('Error deleting student account:', error);
      if (error instanceof Error) {
        debouncedToast(`Failed to delete account: ${error.message}`, 'error');
      } else {
        debouncedToast('Failed to delete account. Please try again.', 'error');
      }
    }
  };

  return {
    students,
    loadingStudents,
    createUserLoading,
    refetchStudents,
    createStudentAccount,
    toggleStudentActiveStatus,
    deleteStudentAccount,
    fetchStudentsPage
  };
};