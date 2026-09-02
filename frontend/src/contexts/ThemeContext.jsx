import { createContext, useContext, useEffect, useState } from 'react';
import { getTemaSistema, salvarTemaSistema } from '../services/configuracoesSistema';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const TEMA_PADRAO = {
  palette: {
    bg: '#f5f7fa',
    surface: '#ffffff',
    border: '#e4e9f0',
    text: '#0f1c2e',
    muted: '#64748b',
    primary: '#3b5bdb',
    primary600: '#2f4ac0',
    secondary: '#7c3aed',
    warning: '#9a5b06',
    danger: '#b32020',
    success: '#116149'
  },
  buttons: {
    primaryBg: '#3b5bdb',
    primaryHover: '#2f4ac0',
    primaryText: '#ffffff',
    secondaryBg: '#eef2f7',
    secondaryHover: '#e4e9f0',
    secondaryText: '#0f1c2e',
    secondaryBorder: '#e4e9f0',
    outlineBg: '#ffffff',
    outlineHover: '#eef2f7',
    outlineText: '#0f1c2e',
    outlineBorder: '#c8d4e8',
    ghostText: '#64748b',
    ghostHoverBg: '#eef2f7',
    ghostHoverText: '#0f1c2e',
    successBg: '#116149',
    successText: '#ffffff',
    dangerBg: '#b32020',
    dangerText: '#ffffff',
    warningBg: '#9a5b06',
    warningText: '#ffffff'
  },
  cards: {
    bg: '#ffffff',
    softBg: '#eef2f7',
    border: '#e4e9f0',
    text: '#0f1c2e',
    muted: '#64748b',
    summaryBg: '#ffffff',
    summaryBorder: '#d8e2f1',
    summaryLabel: '#64748b',
    summaryValue: '#0f1c2e',
    summarySubvalue: '#64748b'
  },
  text: {
    heading: '#0f1c2e',
    body: '#0f1c2e',
    muted: '#64748b',
    subtle: '#74808f',
    link: '#2563eb',
    inverse: '#ffffff'
  },
  numbers: {
    default: '#0f1c2e',
    positive: '#116149',
    negative: '#b32020',
    warning: '#9a5b06',
    info: '#22447f',
    muted: '#64748b'
  },
  moduleAccents: {
    painel: '#2d5c8f',
    solicitacoes: '#3a5f9e',
    comunicacao: '#256f7a',
    biblioteca: '#1d6f66',
    treinamento: '#4a5da8',
    provisionamento: '#37607d',
    sst: '#1f5170',
    compras: '#8a5a12',
    financeiro: '#146152',
    fiscal: '#3f6a5a',
    contratos: '#7a5a2e',
    rhdp: '#4d6b33',
    crm: '#5b4a91',
    comercial: '#6b4f8f',
    cadastros: '#4f5a68',
    administracao: '#3f4650',
    configuracoes: '#59626e',
    conta: '#5b6472'
  },
  actions: {
    ver: '#2563eb',
    assumir: '#16a34a',
    atribuir: '#7c3aed',
    enviar: '#f97316',
    ocultar: '#6b7280'
  },
  status: {
    global: {
      PENDENTE: '#9a5b06',
      EM_ANALISE: '#22447f',
      AGUARDANDO_AJUSTE: '#9a5b06',
      TITULO_CADASTRADO: '#22447f',
      'PAGAMENTO PARCIAL': '#9a5b06',
      'PARCIALMENTE PAGO': '#9a5b06',
      APROVADA: '#116149',
      PAGA: '#116149',
      REJEITADA: '#b32020',
      CONCLUIDA: '#116149'
    },
    setores: {}
  },
  statusBadges: {
    pending: { bg: '#f7f2eb', text: '#9a5b06', border: '#e6d6c1' },
    approved: { bg: '#ecf2f0', text: '#116149', border: '#c4d8d2' },
    rejected: { bg: '#fdeceb', text: '#b32020', border: '#f3c9c7' },
    paid: { bg: '#edf0f5', text: '#22447f', border: '#c8d0df' },
    overdue: { bg: '#fdeceb', text: '#b32020', border: '#f3c9c7' },
    analysis: { bg: '#edf0f5', text: '#22447f', border: '#c8d0df' },
    archived: { bg: '#f2f3f4', text: '#5b6472', border: '#d6d8dc' },
    intercompany: { bg: '#edf0f5', text: '#22447f', border: '#c8d0df' },
    dreYes: { bg: '#ecf2f0', text: '#116149', border: '#c4d8d2' },
    dreNo: { bg: '#f2f3f4', text: '#5b6472', border: '#d6d8dc' }
  }
};

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeTema(base, override) {
  if (!isObject(override)) return JSON.parse(JSON.stringify(base));
  const output = JSON.parse(JSON.stringify(base));

  Object.entries(override).forEach(([key, value]) => {
    if (isObject(value) && isObject(output[key])) {
      output[key] = mergeTema(output[key], value);
    } else if (value !== undefined) {
      output[key] = value;
    }
  });

  return output;
}

// Coleta todas as variaveis CSS derivadas de um tema (sem aplicar).
function coletarTemaVars(tema) {
  const vars = {};
  const setCssVar = (_root, name, value) => {
    if (value) vars[name] = value;
  };
  const root = null;
  const { palette, buttons, cards, text, numbers, statusBadges, moduleAccents } = tema;

  setCssVar(root, '--c-bg', palette.bg);
  setCssVar(root, '--c-surface', palette.surface);
  setCssVar(root, '--c-border', palette.border);
  setCssVar(root, '--c-text', palette.text);
  setCssVar(root, '--c-muted', palette.muted);
  setCssVar(root, '--c-primary', palette.primary);
  setCssVar(root, '--c-primary-600', palette.primary600);
  setCssVar(root, '--c-secondary', palette.secondary);
  setCssVar(root, '--c-warning', palette.warning);
  setCssVar(root, '--c-danger', palette.danger);
  setCssVar(root, '--c-success', palette.success);

  setCssVar(root, '--ui-canvas', palette.bg);
  setCssVar(root, '--ui-surface', palette.surface);
  setCssVar(root, '--ui-surface-soft', cards?.softBg || palette.bg);
  setCssVar(root, '--ui-border', palette.border);
  setCssVar(root, '--input-bg', palette.surface);
  setCssVar(root, '--input-bg-soft', cards?.softBg || palette.bg);
  setCssVar(root, '--input-border', palette.border);
  setCssVar(root, '--input-text', palette.text);
  setCssVar(root, '--input-placeholder', text?.subtle || palette.muted);
  setCssVar(root, '--modal-bg', cards?.bg || palette.surface);
  setCssVar(root, '--modal-border', cards?.border || palette.border);
  setCssVar(root, '--premium-panel-bg', cards?.bg || palette.surface);
  setCssVar(root, '--premium-panel-border', cards?.border || palette.border);
  setCssVar(root, '--premium-panel-muted', cards?.muted || palette.muted);
  setCssVar(root, '--premium-glass-bg', cards?.summaryBg || cards?.bg || palette.surface);
  setCssVar(root, '--premium-glass-border', cards?.summaryBorder || cards?.border || palette.border);
  setCssVar(root, '--premium-action-bg', buttons?.primaryBg || palette.primary);
  setCssVar(root, '--premium-action-bg-hover', buttons?.primaryHover || palette.primary600);
  setCssVar(root, '--premium-outline-bg', buttons?.outlineBg || palette.surface);
  setCssVar(root, '--premium-outline-bg-hover', buttons?.outlineHover || cards?.softBg || palette.bg);
  setCssVar(root, '--premium-outline-text', buttons?.outlineText || palette.text);

  setCssVar(root, '--btn-primary-bg', buttons?.primaryBg);
  setCssVar(root, '--btn-primary-hover', buttons?.primaryHover);
  setCssVar(root, '--btn-primary-text', buttons?.primaryText);
  setCssVar(root, '--btn-secondary-bg', buttons?.secondaryBg);
  setCssVar(root, '--btn-secondary-hover', buttons?.secondaryHover);
  setCssVar(root, '--btn-secondary-text', buttons?.secondaryText);
  setCssVar(root, '--btn-secondary-border', buttons?.secondaryBorder);
  setCssVar(root, '--btn-outline-bg', buttons?.outlineBg);
  setCssVar(root, '--btn-outline-hover', buttons?.outlineHover);
  setCssVar(root, '--btn-outline-text', buttons?.outlineText);
  setCssVar(root, '--btn-outline-border', buttons?.outlineBorder);
  setCssVar(root, '--btn-ghost-text', buttons?.ghostText);
  setCssVar(root, '--btn-ghost-hover-bg', buttons?.ghostHoverBg);
  setCssVar(root, '--btn-ghost-hover-text', buttons?.ghostHoverText);
  setCssVar(root, '--btn-success-bg', buttons?.successBg);
  setCssVar(root, '--btn-success-text', buttons?.successText);
  setCssVar(root, '--btn-danger-bg', buttons?.dangerBg);
  setCssVar(root, '--btn-danger-text', buttons?.dangerText);
  setCssVar(root, '--btn-warning-bg', buttons?.warningBg);
  setCssVar(root, '--btn-warning-text', buttons?.warningText);

  setCssVar(root, '--card-bg', cards?.bg);
  setCssVar(root, '--card-soft-bg', cards?.softBg);
  setCssVar(root, '--card-border', cards?.border);
  setCssVar(root, '--card-text', cards?.text);
  setCssVar(root, '--card-muted', cards?.muted);
  setCssVar(root, '--app-summary-bg', cards?.summaryBg);
  setCssVar(root, '--app-summary-border', cards?.summaryBorder);
  setCssVar(root, '--app-summary-label', cards?.summaryLabel);
  setCssVar(root, '--app-summary-value', cards?.summaryValue);
  setCssVar(root, '--app-summary-subvalue', cards?.summarySubvalue);

  setCssVar(root, '--app-heading-color', text?.heading);
  setCssVar(root, '--app-body-color', text?.body);
  setCssVar(root, '--app-muted-color', text?.muted);
  setCssVar(root, '--app-subtle-color', text?.subtle);
  setCssVar(root, '--app-link-color', text?.link);
  setCssVar(root, '--app-inverse-color', text?.inverse);
  setCssVar(root, '--app-number-color', numbers?.default);
  setCssVar(root, '--app-number-positive', numbers?.positive);
  setCssVar(root, '--app-number-negative', numbers?.negative);
  setCssVar(root, '--app-number-warning', numbers?.warning);
  setCssVar(root, '--app-number-info', numbers?.info);
  setCssVar(root, '--app-number-muted', numbers?.muted);

  Object.entries(statusBadges || {}).forEach(([key, config]) => {
    const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    setCssVar(root, `--status-${cssKey}-bg`, config?.bg);
    setCssVar(root, `--status-${cssKey}-text`, config?.text);
    setCssVar(root, `--status-${cssKey}-border`, config?.border);
  });

  Object.entries(moduleAccents || {}).forEach(([key, value]) => {
    setCssVar(root, `--module-${key}`, value);
  });
  setCssVar(root, '--accent-blue', moduleAccents?.financeiro);
  setCssVar(root, '--accent-green', moduleAccents?.crm || palette.success);
  setCssVar(root, '--accent-amber', moduleAccents?.contratos || palette.warning);
  setCssVar(root, '--fiscal-accent', moduleAccents?.fiscal);
  setCssVar(root, '--rhdp-accent', moduleAccents?.rhdp);
  setCssVar(root, '--sst-accent', moduleAccents?.sst);
  return vars;
}

let TEMA_PADRAO_VARS = null;

// Aplica apenas o que DIFERE do tema padrao. Os valores padrao vivem no
// CSS (:root e .dark em index.css/design-tokens.css); definir tudo inline
// aqui sobrescreveria os tokens do modo escuro, ja que estilo inline no
// <html> vence a classe .dark.
function aplicarTemaCss(tema) {
  if (typeof document === 'undefined' || !tema?.palette) return;
  if (!TEMA_PADRAO_VARS) TEMA_PADRAO_VARS = coletarTemaVars(TEMA_PADRAO);
  const root = document.documentElement;
  const vars = coletarTemaVars(tema);
  const nomes = new Set([...Object.keys(TEMA_PADRAO_VARS), ...Object.keys(vars)]);
  nomes.forEach((nome) => {
    const valor = vars[nome];
    if (!valor || valor === TEMA_PADRAO_VARS[nome]) {
      root.style.removeProperty(nome);
    } else {
      root.style.setProperty(nome, valor);
    }
  });
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
    aplicarTemaCss(tema);
  }, [tema]);

  async function carregar() {
    try {
      const data = await getTemaSistema();
      setTema(mergeTema(TEMA_PADRAO, data));
    } catch (error) {
      console.error(error);
      setTema(TEMA_PADRAO);
    }
  }

  async function atualizarTema(novoTema) {
    const normalizado = mergeTema(TEMA_PADRAO, novoTema);
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
