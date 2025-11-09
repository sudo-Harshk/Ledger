import { GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { debouncedToast } from './debouncedToast';

export async function linkGoogleAccount() {
  if (!auth.currentUser) {
    debouncedToast('No user is currently signed in.', 'error');
    return;
  }
  try {
    const provider = new GoogleAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
    debouncedToast('Google account linked successfully!', 'success');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/credential-already-in-use') {
      debouncedToast('This Google account is already linked to another user.', 'error');
    } else if (error instanceof Error) {
      debouncedToast(error.message, 'error');
    } else {
      debouncedToast('Failed to link Google account.', 'error');
    }
  }
}
