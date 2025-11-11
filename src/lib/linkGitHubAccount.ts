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
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/credential-already-in-use') {
      debouncedToast('This GitHub account is already linked to another user.', 'error');
    } else if (error instanceof Error) {
      debouncedToast(error.message, 'error');
    } else {
      debouncedToast('Failed to link GitHub account.', 'error');
    }
  }
}
