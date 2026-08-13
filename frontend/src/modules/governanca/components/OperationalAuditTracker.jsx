import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { registrarNavegacaoOperacional } from '../services/governancaApi';

const ROUTE_MODULES = [
  [/^\/solicitacoes-compra|^\/pedidos-compra|^\/cotacoes|^\/gestao-fornecedores|^\/compras/, 'COMPRAS'],
  [/^\/solicitacoes/, 'SOLICITACOES'], [/^\/financeiro|^\/comprovantes/, 'FINANCEIRO'],
  [/^\/custos-recebiveis/, 'CUSTOS_RECEBIVEIS'], [/^\/rh-dp/, 'RH_DP'], [/^\/sst/, 'SST'],
  [/^\/fiscal/, 'FISCAL'], [/^\/crm/, 'CRM'], [/^\/comercial/, 'COMERCIAL'],
  [/^\/provisoes-financeiras/, 'PROVISIONAMENTO'], [/^\/contratos|^\/gestao-contratos/, 'CONTRATOS'],
  [/^\/governanca|^\/usuarios|^\/permissoes|^\/configuracoes/, 'ADMINISTRACAO'],
  [/^\/treinamento/, 'TREINAMENTO'], [/^\/arquivos-modelos/, 'BIBLIOTECA'],
  [/^\/comunicacao|^\/conversas/, 'COMUNICACAO']
];

function normalizePath(pathname) {
  return String(pathname || '/')
    .split('/')
    .map((part) => /^\d+$/.test(part) ? ':id' : part)
    .join('/');
}

function moduleFor(pathname) {
  return ROUTE_MODULES.find(([pattern]) => pattern.test(pathname))?.[1] || (pathname === '/' ? 'PAINEL' : 'SISTEMA');
}

export default function OperationalAuditTracker() {
  const location = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    const path = normalizePath(location.pathname);
    if (lastPath.current === path) return;
    lastPath.current = path;
    const modulo = moduleFor(location.pathname);
    const eventoUuid = globalThis.crypto?.randomUUID?.() || `nav-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    registrarNavegacaoOperacional({
      evento_uuid: eventoUuid,
      rota: path,
      pagina_chave: path,
      modulo,
      titulo_pagina: document.title,
      resumo: `Acessou uma pagina em ${modulo}`
    }).catch(() => {});
  }, [location.pathname]);

  return null;
}
