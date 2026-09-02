// =====================================================================
// VERIFICAÇÃO DE LINKS MORTOS E DESTINOS PERDIDOS
// ---------------------------------------------------------------------
// 1. Todo destino da fonte única de navegação precisa casar com uma
//    rota declarada no App.jsx (a aplicação não tem rota curinga: um
//    destino errado dá tela branca silenciosa).
// 2. Nenhum destino da navegação antiga (sidebar do Layout.jsx antes da
//    reforma) pode ter sido perdido.
// Uso: node scripts/validarNavegacao.mjs  (sai com código 1 se falhar)
// =====================================================================
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// --- Destinos da navegação antiga (extraídos do Layout.jsx pré-reforma) ---
const DESTINOS_ANTIGOS = [
  '/', '/solicitacoes', '/solicitacoes/relatorios', '/solicitacoes-arquivadas',
  '/prioridades-diretoria', '/nova-solicitacao', '/comunicacao-interna',
  '/arquivos-modelos', '/treinamento',
  '/solicitacoes-compra', '/solicitacoes-compra/nova', '/pedidos-compra',
  '/compras/delegacao', '/compras/relatorios', '/cotacoes', '/gestao-fornecedores',
  '/configuracoes-cotacao', '/gestao-insumos', '/gestao-unidades', '/gestao-categorias',
  '/financeiro/contas-a-receber', '/financeiro/contas-a-pagar',
  '/financeiro/cheques-terceiros', '/financeiro/baixas-compostas',
  '/financeiro/bancos', '/financeiro/financiamentos-bancarios',
  '/financeiro/pagamentos', '/financeiro/dda', '/financeiro/boletos',
  '/financeiro/faturas-cartao', '/financeiro/relatorios', '/financeiro/baixas',
  '/financeiro/conciliacao', '/financeiro/caixas', '/financeiro/cadastros',
  '/comprovantes/upload', '/comprovantes/pendentes', '/custos-recebiveis',
  '/fiscal', '/fiscal/relatorios', '/fiscal/empresas', '/fiscal/empresas#certificados',
  '/fiscal/diagnostico', '/fiscal/documentos', '/fiscal/divergencias',
  '/fiscal/exportacao-contabil', '/fiscal/logs',
  '/crm/dashboard', '/crm/relatorios', '/crm/inbox', '/crm/leads', '/crm/carteira',
  '/crm/leads/novo', '/crm/kanban', '/crm/tarefas', '/crm/automacoes',
  '/crm/admin/canais', '/crm/admin/numeros', '/crm/admin/integracoes',
  '/comercial/relatorios', '/comercial/empreendimentos', '/comercial/unidades',
  '/comercial/mapa-unidades', '/comercial/tabelas-preco', '/comercial/contratos',
  '/comercial/modelos-contrato',
  '/provisoes-financeiras/dashboard', '/provisoes-financeiras/relatorios',
  '/provisoes-financeiras', '/provisoes-financeiras/nova', '/provisoes-financeiras/categorias',
  '/rh-dp', '/rh-dp/relatorios', '/rh-dp/colaboradores', '/rh-dp/documentos',
  '/rh-dp/importacoes', '/rh-dp/apuracao', '/rh-dp/fechamentos',
  // SST modo completo
  '/sst', '/sst/relatorios/centro-operacional', '/sst/relatorios/executivo',
  '/sst/relatorios/heatmap', '/sst/observabilidade', '/sst/producao',
  '/sst/observabilidade-avancada', '/sst/timeline', '/sst/relatorios',
  '/sst/riscos', '/sst/ambientes', '/sst/exposicoes', '/sst/aso', '/sst/exames',
  '/sst/epi', '/sst/treinamentos', '/sst/acidentes', '/sst/documentos',
  '/sst/esocial', '/sst/eventos', '/sst/pendencias', '/sst/bloqueios',
  '/sst/notificacoes', '/sst/scores', '/sst/recomendacoes', '/sst/telemetria',
  '/sst/alertas_operacionais', '/sst/workflow_execucoes', '/sst/politicas_bloqueio',
  '/sst/workflows', '/sst/workflow_acoes', '/sst/rollout_planos',
  '/sst/hardening_policies', '/sst/criticidades', '/sst/configuracoes',
  // SST modo simplificado
  '/sst/pgr', '/sst/pcmso', '/sst/ltcat', '/sst/avaliacoes_quantitativas',
  '/usuarios', '/empresas-grupo', '/obras', '/gestao-apropriacoes', '/setores',
  '/tipos-solicitacao', '/parceiros', '/parceiros-categorias',
  '/contratos/relatorios', '/gestao-contratos',
  '/governanca', '/governanca/auditoria-operacional',
  '/configuracoes', '/usuarios-acesso-prioridade-diretoria',
  '/usuarios-envio-qualquer-setor', '/tipos-compartilhados-setor',
  '/automacao-status-setor', '/configuracoes-status-pedidos-compra',
  '/configuracoes-comercial-categorias', '/configuracoes-modulos',
  '/configuracoes-notificacoes-sistema', '/arquivos-modelos-config',
  '/perfil'
];

function extrairRotasDoApp() {
  const src = readFileSync(path.join(raiz, 'src/App.jsx'), 'utf8');
  const rotas = new Set();
  for (const match of src.matchAll(/path="([^"]+)"/g)) {
    const p = match[1];
    rotas.add(p.startsWith('/') ? p : `/${p}`);
  }
  // rota index de "/"
  if (src.includes('<Route index')) rotas.add('/');
  return [...rotas];
}

function rotaCasa(destino, rota) {
  const d = destino.split('#')[0].split('?')[0];
  if (d === rota) return true;
  const segD = d.split('/').filter(Boolean);
  const segR = rota.split('/').filter(Boolean);
  if (segD.length !== segR.length) return false;
  return segR.every((seg, i) => seg.startsWith(':') || seg === segD[i]);
}

const rotas = extrairRotasDoApp();

const server = await createServer({
  root: raiz,
  logLevel: 'error',
  server: { middlewareMode: true }
});

try {
  const nav = await server.ssrLoadModule('/src/navigation/navigationConfig.jsx');
  const destinos = nav.getAllDestinations();

  let falhas = 0;

  console.log(`Rotas declaradas no App.jsx: ${rotas.length}`);
  console.log(`Destinos na fonte de navegação: ${destinos.length}`);

  // 1) Nenhum link morto na fonte de navegação
  for (const destino of destinos) {
    const ok = rotas.some((rota) => rotaCasa(destino.to, rota));
    if (!ok) {
      falhas += 1;
      console.error(`LINK MORTO: ${destino.moduleId}/${destino.id} → ${destino.to}`);
    }
  }

  // 2) Nenhum destino da navegação antiga foi perdido
  const alvos = new Set(destinos.map((d) => d.to.split('#')[0].split('?')[0]));
  alvos.add('/'); // hub principal substitui a raiz
  alvos.add('/dashboard'); // dashboard executivo movido de / para /dashboard
  for (const antigo of DESTINOS_ANTIGOS) {
    const chave = antigo.split('#')[0];
    const coberto = antigo === '/'
      ? alvos.has('/dashboard')
      : alvos.has(chave) || destinos.some((d) => d.to === antigo);
    if (!coberto) {
      falhas += 1;
      console.error(`DESTINO PERDIDO da navegação antiga: ${antigo}`);
    }
  }

  // 3) Catálogo de blocos: o backend valida a config do admin contra uma
  //    CÓPIA do catálogo do frontend (BLOCOS_POR_TELA no
  //    DetalheLayoutController). Se alguém criar/remover um bloco num
  //    lado e esquecer o outro, a tela de admin passa a oferecer card
  //    inexistente ou a recusar card válido — este check falha ANTES.
  const blocosDetalheMod = await server.ssrLoadModule('/src/pages/SolicitacaoDetalhe/blocosDetalhe.js');
  const blocosHomeMod = await server.ssrLoadModule('/src/navigation/blocosHome.js');
  const catalogosFrontend = {
    'detalhe-solicitacao': blocosDetalheMod.BLOCOS_DETALHE.map((b) => b.id),
    home: blocosHomeMod.BLOCOS_HOME.map((b) => b.id)
  };
  const controllerPath = path.join(raiz, '../backend/src/controllers/DetalheLayoutController.js');
  const controllerSrc = readFileSync(controllerPath, 'utf8');
  const extrairSetBackend = (tela) => {
    const marcador = tela === 'home' ? /home:\s*new Set\(\[([^\]]*)\]\)/ : /'detalhe-solicitacao':\s*new Set\(\[([^\]]*)\]\)/;
    const m = controllerSrc.match(marcador);
    if (!m) return null;
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };
  for (const [tela, idsFrontend] of Object.entries(catalogosFrontend)) {
    const idsBackend = extrairSetBackend(tela);
    if (!idsBackend) {
      falhas += 1;
      console.error(`CATÁLOGO DE BLOCOS: não achei o Set da tela '${tela}' em ${controllerPath}`);
      continue;
    }
    const front = new Set(idsFrontend);
    const back = new Set(idsBackend);
    for (const id of front) {
      if (!back.has(id)) {
        falhas += 1;
        console.error(`CATÁLOGO DE BLOCOS divergente ('${tela}'): '${id}' existe no frontend e falta no DetalheLayoutController`);
      }
    }
    for (const id of back) {
      if (!front.has(id)) {
        falhas += 1;
        console.error(`CATÁLOGO DE BLOCOS divergente ('${tela}'): '${id}' existe no DetalheLayoutController e não no frontend`);
      }
    }
  }

  if (falhas > 0) {
    console.error(`\nFALHOU: ${falhas} problema(s).`);
    process.exitCode = 1;
  } else {
    console.log('\nOK: nenhum link morto; nenhum destino da navegação antiga foi perdido; catálogos de blocos front↔back idênticos.');
  }
} finally {
  await server.close();
}
