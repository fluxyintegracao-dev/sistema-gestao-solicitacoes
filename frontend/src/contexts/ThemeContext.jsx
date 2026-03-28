import { createContext, useContext, useEffect, useState } from 'react';
import { getTemaSistema, salvarTemaSistema } from '../services/configuracoesSistema';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

const PALETA_AZUL = {
  palette: {
    bg: '#f3f7fd',
    surface: '#ffffff',
    border: '#d5e0ef',
    text: '#0f1f3a',
    muted: '#5f7496',
    primary: '#2563eb',
    primary600: '#1d4ed8',
    secondary: '#3b82f6',
    warning: '#60a5fa',
    danger: '#1e40af',
    success: '#0ea5e9'
  },
  actions: {
    ver: '#2563eb',
    assumir: '#1d4ed8',
    atribuir: '#3b82f6',
    enviar: '#0ea5e9',
    ocultar: '#64748b'
  },
  status: {
    global: {
      PENDENTE: '#94a3b8',
      EM_ANALISE: '#38bdf8',
      AGUARDANDO_AJUSTE: '#60a5fa',
      APROVADA: '#2563eb',
      REJEITADA: '#1d4ed8',
      CONCLUIDA: '#0ea5e9'
    },
    setores: {}
  }
};

const TEMA_PADRAO = {
  palette: {
    ...PALETA_AZUL.palette
  },
  actions: {
    ...PALETA_AZUL.actions
  },
  status: {
    global: { ...PALETA_AZUL.status.global },
    setores: {}
  }
};

function mergeTema(base, override) {
  if (!override) return base;
  return {
    palette: { ...base.palette, ...(override.palette || {}) },
    actions: { ...base.actions, ...(override.actions || {}) },
    status: {
      global: { ...base.status.global, ...(override.status?.global || {}) },
      setores: { ...base.status.setores, ...(override.status?.setores || {}) }
    }
  };
}

function forcarEscalaAzul(tema) {
  return {
    palette: { ...PALETA_AZUL.palette },
    actions: { ...PALETA_AZUL.actions },
    status: {
      ...tema.status,
      global: { ...PALETA_AZUL.status.global }
    }
  };
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(TEMA_PADRAO);
  const { user } = useAuth();

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    carregar();
  }, [user?.id, user?.email]);

  useEffect(() => {
    function recarregarAoFocar() {
      carregar();
    }

    window.addEventListener('focus', recarregarAoFocar);
    document.addEventListener('visibilitychange', recarregarAoFocar);
    return () => {
      window.removeEventListener('focus', recarregarAoFocar);
      document.removeEventListener('visibilitychange', recarregarAoFocar);
    };
  }, []);

  useEffect(() => {
    if (!tema?.palette) return;
    const root = document.documentElement;
    root.style.setProperty('--c-bg', tema.palette.bg);
    root.style.setProperty('--c-surface', tema.palette.surface);
    root.style.setProperty('--c-border', tema.palette.border);
    root.style.setProperty('--c-text', tema.palette.text);
    root.style.setProperty('--c-muted', tema.palette.muted);
    root.style.setProperty('--c-primary', tema.palette.primary);
    root.style.setProperty('--c-primary-600', tema.palette.primary600);
    root.style.setProperty('--c-secondary', tema.palette.secondary);
    root.style.setProperty('--c-warning', tema.palette.warning);
    root.style.setProperty('--c-danger', tema.palette.danger);
    root.style.setProperty('--c-success', tema.palette.success);
  }, [tema]);

  async function carregar() {
    try {
      const data = await getTemaSistema();
      const merged = mergeTema(TEMA_PADRAO, data);
      setTema(forcarEscalaAzul(merged));
    } catch (error) {
      console.error(error);
      setTema(TEMA_PADRAO);
    }
  }

  async function atualizarTema(novoTema) {
    const merged = mergeTema(TEMA_PADRAO, novoTema);
    const normalizado = forcarEscalaAzul(merged);
    await salvarTemaSistema(normalizado);
    setTema(normalizado);
  }

  return (
    <ThemeContext.Provider value={{ tema, atualizarTema, recarregarTema: carregar }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
