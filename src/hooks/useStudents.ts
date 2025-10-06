import { useState, useCallback, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, deleteDoc, writeBatch, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/firebase';
import { debouncedToast } from '@/lib';
import toast from 'react-hot-toast';

interface StudentAccount {
  id: string;
  username: string;
  displayName: string;
  monthlyFee: number;
  createdAt: Date;
  totalDueByMonth?: { [key: string]: any };
}

export const useStudents = () => {
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [lastVisibleStudent, setLastVisibleStudent] = useState<any>(null);
  const [firstVisibleStudent, setFirstVisibleStudent] = useState<any>(null);
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
  }, [initialFetchStudents]);

  // Fetch paginated students
  const fetchStudentsPage = useCallback(
    async (direction: 'next' | 'prev' = 'next') => {
      setLoadingStudents(true);
      let studentsQuery;
      try {
        if (direction === 'next' && lastVisibleStudent) {
          studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            orderBy('createdAt'),
            startAfter(lastVisibleStudent),
            limit(pageSize)
          );
        } else if (direction === 'prev' && firstVisibleStudent) {
          // For simplicity, just reload the first page
          studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            orderBy('createdAt'),
            limit(pageSize)
          );
          setLastVisibleStudent(null);
          setFirstVisibleStudent(null);
        } else {
          studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            orderBy('createdAt'),
            limit(pageSize)
          );
          setLastVisibleStudent(null);
          setFirstVisibleStudent(null);
        }
        const snapshot = await getDocs(studentsQuery);
        const studentsList = snapshot.docs.map(doc => ({ ...(doc.data() as StudentAccount), id: doc.id }));
        setStudents(studentsList);
        setFirstVisibleStudent(snapshot.docs[0]);
        setLastVisibleStudent(snapshot.docs[snapshot.docs.length - 1]);
      } catch (error) {
        toast.error('Failed to fetch students. Please try again.');
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }, [lastVisibleStudent, firstVisibleStudent, pageSize]);

  // Refetch students
  const refetchStudents = async (direction?: 'next' | 'prev') => {
    if (direction) {
      await fetchStudentsPage(direction);
    } else {
      setLastVisibleStudent(null);
      setFirstVisibleStudent(null);
      await initialFetchStudents();
    }
  };

  // Create student account
  const createStudentAccount = async (
    newStudentUsername: string,
    newStudentName: string,
    newStudentPassword: string,
    newStudentMonthlyFee: number,
    userUid: string
  ) => {
    if (!newStudentUsername || !newStudentName || !newStudentPassword) {
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

    setCreateUserLoading(true);
    try {
      const timestamp = Date.now();
      const uniqueEmail = `${newStudentUsername}_${timestamp}@ledger.student`;
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth, 
        uniqueEmail, 
        newStudentPassword
      );
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        username: newStudentUsername,
        email: uniqueEmail,
        role: 'student',
        displayName: newStudentName,
        monthlyFee: newStudentMonthlyFee,
        createdAt: new Date(),
        createdBy: userUid
      });
      await refetchStudents();
      debouncedToast(`Student account created successfully! Username: ${newStudentUsername}`, 'success');
      return true; // Success
    } catch (error: unknown) {
      console.error('Error creating student account:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        debouncedToast('Username is already taken. Please choose a different username.', 'error');
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/weak-password') {
        debouncedToast('Password is too weak. Please use a stronger password (at least 6 characters).', 'error');
      } else if (error instanceof Error) {
        debouncedToast(`Failed to create account: ${error.message}`, 'error');
      } else {
        debouncedToast('Failed to create account. Please try again.', 'error');
      }
      return false; // Failure
    } finally {
      setCreateUserLoading(false);
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
    deleteStudentAccount
  };
};
