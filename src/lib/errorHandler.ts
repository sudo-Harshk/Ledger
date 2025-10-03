export const setupGlobalErrorHandler = () => {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('message channel closed')) {
      console.warn('Browser extension interference detected. This is usually harmless.');
      event.preventDefault(); 
      return;
    }
        console.error('Unhandled promise rejection:', event.reason);
  });

  window.addEventListener('error', (event) => {
    if (event.message?.includes('message channel closed')) {
      console.warn('Browser extension interference detected. This is usually harmless.');
      event.preventDefault();
      return;
    }
    
    console.error('Global error:', event.error);
  });
};

if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
}
