import { GithubAuthProvider, linkWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { debouncedToast } from './debouncedToast';

export async function linkGitHubAccount() {
  if (!auth.currentUser) {
    debouncedToast('No user is currently signed in.', 'error');
    return;
  }
  try {
    const provider = new GithubAuthProvider();
    await linkWithPopup(auth.currentUser, provider);
    debouncedToast('GitHub account linked successfully!', 'success');
    // Optionally, you may want to reload the page or user data here
  } catch (error: any) {
    if (error.code === 'auth/credential-already-in-use') {
      debouncedToast('This GitHub account is already linked to another user.', 'error');
    } else if (error.message) {
      debouncedToast(error.message, 'error');
    } else {
      debouncedToast('Failed to link GitHub account.', 'error');
    }
  }
}
