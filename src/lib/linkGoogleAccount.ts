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
    // Optionally, you may want to reload the page or user data here
  } catch (error: any) {
    if (error.code === 'auth/credential-already-in-use') {
      debouncedToast('This Google account is already linked to another user.', 'error');
    } else if (error.message) {
      debouncedToast(error.message, 'error');
    } else {
      debouncedToast('Failed to link Google account.', 'error');
    }
  }
}
