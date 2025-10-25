import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './lib/queryClient.tsx';
import App from './App.tsx';
import './index.css';
import { errorLogger } from './utils/errorLogger';

// Global error handler
window.addEventListener('error', (event) => {
  errorLogger.log(event.error || event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.log(event.reason, {
    type: 'unhandled promise rejection'
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>
);
