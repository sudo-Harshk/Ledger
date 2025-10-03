import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/firebase';
import { logger, debouncedToast } from '@/lib';

export const useTeacherSetup = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const enableAdminSetup = import.meta.env.VITE_ENABLE_ADMIN_SETUP === 'true';

  const checkTeacherSetup = useCallback(async () => {
    try {
      const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const teachersSnapshot = await getDocs(teachersQuery);
      setShowSetup(teachersSnapshot.empty);
    } catch (error: unknown) {
      logger.error('Error checking teacher setup:', error);
    }
  }, []);

  const setupAdminTeacher = async () => {
    if (!window.confirm('This will create the admin teacher account. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const email = window.prompt('Enter admin teacher email:') || '';
      const password = window.prompt('Enter a strong password for admin teacher:') || '';
      if (!email || !password) {
        debouncedToast('Email and password are required', 'error');
        setLoading(false);
        return;
      }
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: email,
        role: 'teacher',
        displayName: 'Admin Teacher',
        monthlyFee: 0,
        createdAt: new Date()
      });
      debouncedToast('Admin teacher account created successfully! Please store credentials securely.', 'success');
      await checkTeacherSetup();
    } catch (error: unknown) {
      logger.error('Error creating admin teacher account');
      if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-in-use') {
        debouncedToast('Admin teacher account already exists. You can sign in with the saved credentials.', 'error');
      } else if (error instanceof Error) {
        debouncedToast(`Failed to create admin teacher account: ${error.message}`, 'error');
      } else {
        debouncedToast('Failed to create admin teacher account. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    showSetup,
    loading,
    enableAdminSetup,
    checkTeacherSetup,
    setupAdminTeacher
  };
};
