import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from './lib/queryClient.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>
);
