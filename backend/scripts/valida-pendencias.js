// =====================================================================
// VERIFICAÇÃO CARTÃO × LISTA — MariaDB REAL + controllers REAIS.
// Para cada cartão de pendência devolvido por /dashboard/pendencias,
// abre a lista pelo LINK do próprio cartão e compara:
//   total exibido no cartão  ===  meta.total da lista aberta
// Cobre também os cartões de títulos (tela de contas a pagar/receber
// com os parâmetros do link) e o de compras.
// Cenário inclui 70 aprovações (mais que o antigo teto de 61) para
// provar que o bug "61 → lista do setor inteiro" morreu.
// =====================================================================
// Este script GRAVA dados de cenário no banco apontado (setores, usuários,
// solicitações, títulos…). A trava abaixo é obrigatória de propósito: só
// rode contra base descartável ou staging, NUNCA produção.
if (String(process.env.ALLOW_DEV_TEST_WRITES || '').toLowerCase() !== 'true') {
  console.error(
    'valida-pendencias: recusado. Este script grava dados de cenário no banco apontado.\n' +
    'Exporte ALLOW_DEV_TEST_WRITES=true para confirmar que o banco é descartável/staging.'
  );
  process.exit(1);
}

// Conexão vem do ambiente (o .env do backend-dev serve). Os defaults
// abaixo só cobrem uma base local descartável de validação — em staging,
// exporte DB_* antes de rodar. NUNCA aponte para produção.
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'fluxy';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'fluxy123';
process.env.DB_NAME = process.env.DB_NAME || 'fluxy_valida_pend';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'valida-pendencias-secret';

const path = require('path');
const BACKEND = path.resolve(__dirname, '..');

async function main() {
  // O script NÃO roda migrations (decisão do responsável, 02/09): o schema
  // vem pronto do passo anterior do roteiro (ALLOW_SCHEMA_MIGRATIONS=true
  // npm run migrate). Aqui só se confere — pendência aborta com a lista.
  const { assertMigrationsUpToDate } = require(path.join(BACKEND, 'src/database/runMigrations'));
  await assertMigrationsUpToDate();

  const db = require(path.join(BACKEND, 'src/models'));
  const {
    User, Setor, Obra, TipoSolicitacao, Parceiro, Solicitacao, Historico,
    Contrato, TituloFinanceiro, SolicitacaoCompra, SolicitacaoVisibilidadeUsuario
  } = db;

  // ----- SEED ----------------------------------------------------------
  const setorFin = await Setor.create({ nome: 'Financeiro', codigo: 'FINANCEIRO', eh_setor_financeiro: true });
  const setorEng = await Setor.create({ nome: 'Engenharia', codigo: 'ENGENHARIA', eh_setor_obra: true });

  const usuarioFin = await User.create({
    nome: 'Valida Financeiro', email: 'valida.fin@test.dev',
    senha: 'x'.repeat(60), perfil: 'FINANCEIRO', ativo: true, setor_id: setorFin.id
  });
  const outroUsuario = await User.create({
    nome: 'Valida Eng', email: 'valida.eng@test.dev',
    senha: 'x'.repeat(60), perfil: 'SETOR', ativo: true, setor_id: setorEng.id
  });

  const obra = await Obra.create({ nome: 'OBRA VALIDA', codigo: 'OB-001' });
  const tipo = await TipoSolicitacao.create({ nome: 'Pagamento', codigo_interno: 'PAG' });
  const parceiro = await Parceiro.create({ nome: 'FORNECEDOR VALIDA LTDA', tipo_pessoa: 'J', cpf_cnpj: '00.000.000/0001-00' });

  const criarSol = (props) => Solicitacao.create({
    obra_id: obra.id,
    tipo_solicitacao_id: tipo.id,
    descricao: props.descricao || 'validação',
    status_global: 'PENDENTE',
    area_responsavel: 'FINANCEIRO',
    criado_por: props.criado_por || outroUsuario.id,
    valor: 100,
    cancelada: false,
    ...props
  });

  // 70 aprovações de diretoria pendentes no setor (mais que o teto antigo de 61)
  for (let i = 0; i < 70; i += 1) {
    await criarSol({
      codigo: `SOL-A${String(i).padStart(3, '0')}`,
      fluxo_aprovacao_diretoria: true,
      aprovada_diretoria_em: null,
      descricao: `aprovação ${i}`
    });
  }
  // 25 paradas comuns no setor (sem fluxo de diretoria)
  for (let i = 0; i < 25; i += 1) {
    await criarSol({ codigo: `SOL-P${String(i).padStart(3, '0')}`, descricao: `parada ${i}` });
  }
  // 3 devoluções: criadas pelo usuárioFin, no setor dele, com ENVIADA_SETOR
  for (let i = 0; i < 3; i += 1) {
    const dev = await criarSol({
      codigo: `SOL-D${String(i).padStart(2, '0')}`,
      criado_por: usuarioFin.id,
      descricao: `devolução ${i}`
    });
    await Historico.create({
      solicitacao_id: dev.id, acao: 'ENVIADA_SETOR', setor: 'ENGENHARIA',
      usuario_responsavel_id: usuarioFin.id
    });
  }
  // 2 contratos aguardando aprovação, com solicitação-mãe no setor
  for (let i = 0; i < 2; i += 1) {
    const mae = await criarSol({ codigo: `SOL-C${String(i).padStart(2, '0')}`, descricao: `contrato ${i}` });
    await Contrato.create({
      obra_id: obra.id, codigo: `CT-${i}`, descricao: `contrato ${i}`,
      valor_total: 1000, ativo: true, fluxo_novo: true,
      status_contrato: 'AGUARDANDO_APROVACAO', solicitacao_id: mae.id
    });
  }
  // 1 parada arquivada pelo usuário (deve sair do cartão E da lista)
  const arquivada = await criarSol({ codigo: 'SOL-ARQ', descricao: 'arquivada' });
  await SolicitacaoVisibilidadeUsuario.create({
    usuario_id: usuarioFin.id, solicitacao_id: arquivada.id, oculto: true
  });
  // 1 cancelada (fora de tudo)
  await criarSol({ codigo: 'SOL-CANC', cancelada: true });

  // Títulos: 4 vencidos PAGAR (PREVISAO/ABERTO/PARCIAL contam; QUITADO não),
  // 2 vencendo em 7d, 1 RECEBER vencido
  const criarTitulo = (props) => TituloFinanceiro.create({
    obra_id: obra.id, parceiro_id: parceiro.id, tipo: 'PAGAR',
    descricao: 'título validação', valor: 500, valor_original: 500, valor_saldo: 500,
    status: 'ABERTO', data_vencimento: '2026-08-01', codigo: props.codigo,
    ...props
  });
  await criarTitulo({ codigo: 'TIT-V1', status: 'ABERTO', data_vencimento: '2026-08-01' });
  await criarTitulo({ codigo: 'TIT-V2', status: 'PREVISAO', data_vencimento: '2026-08-10' });
  await criarTitulo({ codigo: 'TIT-V3', status: 'PARCIAL', data_vencimento: '2026-08-20' });
  await criarTitulo({ codigo: 'TIT-V4', status: 'ABERTO', data_vencimento: '2026-08-30' });
  await criarTitulo({ codigo: 'TIT-Q', status: 'QUITADO', data_vencimento: '2026-08-15', valor_saldo: 0 });
  await criarTitulo({ codigo: 'TIT-F1', status: 'ABERTO', data_vencimento: '2026-09-02' });
  await criarTitulo({ codigo: 'TIT-F2', status: 'PREVISAO', data_vencimento: '2026-09-05' });
  await criarTitulo({ codigo: 'TIT-R1', tipo: 'RECEBER', status: 'ABERTO', data_vencimento: '2026-08-05' });

  // Compras: 2 liberadas + 1 encerrada
  await SolicitacaoCompra.create({ titulo: 'Compra 1', obra_id: obra.id, solicitante_id: usuarioFin.id, status: 'LIBERADO_PARA_COMPRA', origem: 'AVULSA' });
  await SolicitacaoCompra.create({ titulo: 'Compra 2', obra_id: obra.id, solicitante_id: usuarioFin.id, status: 'LIBERADO_PARA_COMPRA', origem: 'AVULSA' });
  await SolicitacaoCompra.create({ titulo: 'Compra 3', obra_id: obra.id, solicitante_id: usuarioFin.id, status: 'ENCERRADO', origem: 'AVULSA' });

  // ----- usuário do req (mesmo shape do buildSessionUser p/ estes casos)
  const u = await User.findByPk(usuarioFin.id, { include: [{ model: Setor, as: 'setor' }] });
  const reqUser = {
    ...u.get({ plain: true }),
    area: u.setor?.codigo || null,
    financeiro_liberado: true,
    rh_dp_capacidades: [],
    integracao_sienge_capacidades: [],
    areas_permissoes: []
  };

  const DashboardPendenciasController = require(path.join(BACKEND, 'src/controllers/DashboardPendenciasController'));
  const SolicitacaoController = require(path.join(BACKEND, 'src/controllers/SolicitacaoController'));
  const TituloFinanceiroController = require(path.join(BACKEND, 'src/controllers/TituloFinanceiroController'));

  function resMock() {
    const captura = {};
    return {
      captura,
      status(codigo) { captura.status = codigo; return this; },
      json(payload) { captura.body = payload; return this; },
      sendStatus(codigo) { captura.status = codigo; return this; }
    };
  }
  const chamar = async (controllerFn, query) => {
    const res = resMock();
    await controllerFn({ user: reqUser, query, auth: {}, headers: {} }, res);
    return res.captura;
  };

  // ----- 1) pendências -------------------------------------------------
  const pend = await chamar(DashboardPendenciasController.index, {});
  const cartoes = pend.body?.itens || [];
  console.log('\ncartões devolvidos:', cartoes.map((c) => `${c.chave}=${c.quantidade}`).join(' | '));

  const resultados = [];
  const isoLocalHoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  for (const cartao of cartoes) {
    const url = new URL(`http://x${cartao.link}`);
    let totalLista = null;
    let detalheLista = '';

    if (url.pathname === '/solicitacoes') {
      const query = Object.fromEntries(url.searchParams.entries());
      query.page = '1';
      query.limit = '25';
      const lista = await chamar(SolicitacaoController.index, query);
      totalLista = Number(lista.body?.meta?.total ?? NaN);
      detalheLista = `visao=${query.visao || '-'}`;
    } else if (url.pathname.startsWith('/financeiro/contas-a-')) {
      // Reproduz EXATAMENTE o que a tela faz com os params do link.
      const tipoTela = url.pathname.endsWith('pagar') ? 'PAGAR' : 'RECEBER';
      const filtros = { tipo: tipoTela, paginated: 'true', page: '1', limit: '20' };
      const hoje = isoLocalHoje();
      if (url.searchParams.get('vencidos') === '1') {
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        filtros.status = 'EM_ABERTO';
        filtros.vencimento_final = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;
      } else if (url.searchParams.get('vencendo_ate')) {
        filtros.status = 'EM_ABERTO';
        filtros.vencimento_inicial = hoje;
        filtros.vencimento_final = url.searchParams.get('vencendo_ate');
      }
      const lista = await chamar(TituloFinanceiroController.index, filtros);
      totalLista = Number(lista.body?.pagination?.total ?? lista.body?.meta?.total ?? (Array.isArray(lista.body) ? lista.body.length : NaN));
      detalheLista = `titulos ${tipoTela}`;
    } else if (url.pathname === '/solicitacoes-compra') {
      // A tela filtra client-side pelo status do link sobre a lista toda.
      const status = url.searchParams.get('status');
      totalLista = await SolicitacaoCompra.count({ where: { status } });
      detalheLista = `compras status=${status}`;
    }

    const ok = Number(cartao.quantidade) === totalLista;
    resultados.push({ cartao: cartao.chave, exibido: cartao.quantidade, lista: totalLista, ok, detalheLista });
  }

  console.log('\n===== CARTÃO × LISTA =====');
  for (const r of resultados) {
    console.log(`${r.ok ? 'OK  ' : 'FALHA'} ${r.cartao.padEnd(32)} cartão=${String(r.exibido).padEnd(5)} lista=${String(r.lista).padEnd(5)} (${r.detalheLista})`);
  }
  const falhas = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} cartões batem com a lista.`);

  // Conferência extra: aprovações NÃO podem cair no fallback do setor
  const aprov = cartoes.find((c) => c.chave === 'aprovacoes_diretoria');
  console.log('\nlink das aprovações:', aprov?.link, aprov?.link?.includes('visao=aprovacoes-diretoria') ? '(visão nomeada OK)' : '(ERRADO)');

  process.exit(falhas.length > 0 ? 1 : 0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
