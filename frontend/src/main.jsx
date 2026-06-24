import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LiveUpdatesProvider } from './contexts/LiveUpdatesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import { applyNativeDocumentAttributes } from './mobile/runtime';
import { installFetchSecurityDefaults } from './services/api';
import './index.css';

applyNativeDocumentAttributes();
installFetchSecurityDefaults();

function AppShell() {
  const location = useLocation();

  return (
    <AppErrorBoundary resetKey={location.pathname}>
      <AuthProvider>
        <LiveUpdatesProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LiveUpdatesProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <AppShell />
  </BrowserRouter>
);
