import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@/lib/errorHandler';

// Suppress extension-related errors that don't affect functionality
window.addEventListener('error', function(e) {
  if (e.message.includes('listener indicated an asynchronous response') || 
      e.message.includes('message channel closed') ||
      e.message.includes('anchor?ar=1')) {
    e.preventDefault();
    return false;
  }
});

// Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', function(e) {
  if (e.reason && e.reason.message && 
      (e.reason.message.includes('listener indicated an asynchronous response') ||
       e.reason.message.includes('message channel closed'))) {
    e.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
