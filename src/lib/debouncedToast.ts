import toast from 'react-hot-toast';

// Store last shown time for each message/type
const lastToastTimes: Record<string, number> = {};

export function debouncedToast(
  message: string,
  type: 'success' | 'error' | 'loading' | 'info' = 'info',
  wait = 500
) {
  const key = `${type}:${message}`;
  const now = Date.now();
  if (!lastToastTimes[key] || now - lastToastTimes[key] > wait) {
    lastToastTimes[key] = now;
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'loading':
        toast.loading(message);
        break;
      default:
        toast(message);
    }
  }
}
