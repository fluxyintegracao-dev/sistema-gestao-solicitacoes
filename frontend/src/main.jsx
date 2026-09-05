import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LiveUpdatesProvider } from './contexts/LiveUpdatesContext';
import { PreferenciasProvider } from './contexts/PreferenciasContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppErrorBoundary from './components/AppErrorBoundary';
import { applyNativeDocumentAttributes } from './mobile/runtime';
import { installFetchSecurityDefaults } from './services/api';
import './index.css';
import './styles/design-tokens.css';
import './components/lista-avancada/lista-avancada.css';
import './styles/escala.css';
import './styles/componentes-padrao.css';
import './modules/solicitacao-compra/compras-responsive.css';
import './styles/responsive-system.css';

applyNativeDocumentAttributes();
installFetchSecurityDefaults();

// Marca de versão legível pelo harness de QA (window.__FLUXY_BUILD__): o SHA
// do commit que gerou este bundle, injetado pelo vite.config (define).
// eslint-disable-next-line no-undef
window.__FLUXY_BUILD__ = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : '';

function AppShell() {
  const location = useLocation();

  return (
    <AppErrorBoundary resetKey={location.pathname}>
      <AuthProvider>
        {/*
          DENTRO do AuthProvider, e não fora: a carga única
          (GET /me/preferencias) só faz sentido com sessão, e o dono do
          registro é sempre o usuário autenticado. Sem sessão — a tela de
          login e a cotação pública do fornecedor — este provedor não
          carrega nem grava nada, e as tabelas seguem no localStorage
          exatamente como antes de 05/09.
        */}
        <PreferenciasProvider>
          <LiveUpdatesProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </LiveUpdatesProvider>
        </PreferenciasProvider>
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
