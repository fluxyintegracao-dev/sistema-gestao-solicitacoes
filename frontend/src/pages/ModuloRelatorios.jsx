import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUiVisibility } from '../hooks/useUiVisibility';
import {
  canAccessContratos,
  canExecuteRhDpImportacoes,
  canViewComprasCotacoes,
  canViewComprasPedidos,
  canViewComercialContratos,
  canViewComercialEmpreendimentos,
  canViewCrmDashboard,
  canViewFiscalDocuments,
  canViewFiscalLogs,
  canViewProvisionamentos,
  canViewProvisionamentosDashboard,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpObrigacoes,
  canViewSolicitacoesRelatorioOperacional,
  canViewSolicitacoesRelatorios,
  hasPermissao,
  isBusinessAdmin
} from '../utils/acessoProduto';

const PERMISSIONS = {
  businessAdmin: isBusinessAdmin,
  comprasCotacoes: canViewComprasCotacoes,
  comprasPedidos: canViewComprasPedidos,
  contratos: canAccessContratos,
  comercialContratos: canViewComercialContratos,
  comercialEmpreendimentos: canViewComercialEmpreendimentos,
  crmDashboard: canViewCrmDashboard,
  fiscalDocuments: canViewFiscalDocuments,
  fiscalLogs: canViewFiscalLogs,
  provisoesDashboard: canViewProvisionamentosDashboard,
  provisoesLista: canViewProvisionamentos,
  rhDpApuracao: canViewRhDpApuracao,
  rhDpColaboradores: canViewRhDpColaboradores,
  rhDpImportacoes: canExecuteRhDpImportacoes,
  rhDpObrigacoes: canViewRhDpObrigacoes,
  solicitacoesRelatorioOperacional: canViewSolicitacoesRelatorioOperacional,
  solicitacoesRelatorios: canViewSolicitacoesRelatorios
};

const HUBS = {
  solicitacoes: {
    modulo: 'Solicitacoes',
    titulo: 'Relatorios de Solicitacoes',
    subtitulo: 'Fluxo operacional, gargalos, SLA e produtividade por setor, usuario e centro de custo.',
    secoes: [
      {
        titulo: 'Operacao',
        itens: [
          { titulo: 'Painel operacional', descricao: 'Volume, funil, gargalos e distribuicao por status, setor e obra/centro.', to: '/solicitacoes/relatorios/operacional', status: 'Disponivel', permissao: 'solicitacoesRelatorioOperacional', permissaoKey: 'solicitacoes.relatorios.operacional', componentKey: 'relatorios.solicitacoes.operacional' },
          { titulo: 'Solicitacoes abertas', descricao: 'Base operacional para filtros por status, setor, tipo e responsavel.', to: '/solicitacoes', status: 'Disponivel', permissao: 'solicitacoesRelatorios', permissaoKey: 'solicitacoes.relatorios.abertas', componentKey: 'relatorios.solicitacoes.abertas' },
          { titulo: 'Solicitacoes arquivadas', descricao: 'Historico de solicitacoes encerradas ou fora da fila operacional.', to: '/solicitacoes-arquivadas', status: 'Disponivel', permissao: 'solicitacoesRelatorios', permissaoKey: 'solicitacoes.relatorios.arquivadas', componentKey: 'relatorios.solicitacoes.arquivadas' },
          { titulo: 'SLA por setor', descricao: 'Configuracao real de prazos por setor para leitura do painel operacional.', to: '/solicitacoes-sla-setor', status: 'Disponivel', permissao: 'businessAdmin', permissaoKey: 'solicitacoes.relatorios.sla_setor', componentKey: 'relatorios.solicitacoes.sla_setor' }
        ]
      },
      {
        titulo: 'Gestao',
        itens: [
          { titulo: 'Funil de solicitacoes', descricao: 'Criadas, assumidas, enviadas, aprovadas, concluidas e arquivadas.', status: 'Planejado', permissao: 'solicitacoesRelatorios', permissaoKey: 'solicitacoes.relatorios.funil', componentKey: 'relatorios.solicitacoes.funil' },
          { titulo: 'Volume por obra/centro de custo', descricao: 'Demanda operacional por origem de custo.', status: 'Planejado', permissao: 'solicitacoesRelatorios', permissaoKey: 'solicitacoes.relatorios.volume_obra_centro', componentKey: 'relatorios.solicitacoes.volume_obra_centro' }
        ]
      }
    ]
  },
  compras: {
    modulo: 'Compras',
    titulo: 'Relatorios de Compras',
    subtitulo: 'Demanda, pedidos, cotacoes, fornecedores, economia e auditoria do ciclo de suprimentos.',
    secoes: [
      {
        titulo: 'Relatorios disponiveis',
        itens: [
          { titulo: 'Auditoria de compras', descricao: 'Acompanhamento administrativo de compras e evidencias do processo.', to: '/compras/relatorios/auditoria', status: 'Disponivel', permissao: 'businessAdmin', componentKey: 'relatorios.compras.auditoria' },
          { titulo: 'Demanda e pedidos', descricao: 'Solicitacoes e pedidos por status, obra/centro e valor pedido.', to: '/compras/relatorios/demanda-pedidos', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.demanda_pedidos' },
          { titulo: 'Evolucao mensal', descricao: 'Curva mensal de compras emitidas por valor, pedidos, obras e status.', to: '/compras/relatorios/evolucao', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.evolucao' },
          { titulo: 'Compras por fornecedor', descricao: 'Valor efetivamente pedido por fornecedor, obra/centro, status e pedido emitido.', to: '/compras/relatorios/compras-fornecedor', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.compras_fornecedor' },
          { titulo: 'Categorias e insumos', descricao: 'Valor pedido por categoria, insumo e obra/centro com base nos itens dos pedidos.', to: '/compras/relatorios/categorias-insumos', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.categorias_insumos' },
          { titulo: 'Precos por insumo', descricao: 'Preco medio de compra por insumo e fornecedor a partir dos itens reais dos pedidos.', to: '/compras/relatorios/precos-insumos', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.precos_insumos' },
          { titulo: 'Cotacoes', descricao: 'Lista de cotacoes, status de resposta e encerramento.', to: '/cotacoes', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.cotacoes' },
          { titulo: 'Pedidos de compra', descricao: 'Pedidos emitidos, status e detalhamento por fornecedor.', to: '/pedidos-compra', status: 'Disponivel', permissao: 'comprasPedidos', componentKey: 'relatorios.compras.pedidos_compra' },
          { titulo: 'Economia em cotacoes', descricao: 'Comparativo entre menor preco disponivel e vencedor selecionado.', to: '/compras/relatorios/economia-cotacoes', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.economia_cotacoes' },
          { titulo: 'Pendencias de cotacoes', descricao: 'Cotacoes sem minimo de respostas e fornecedores com prazo vencido sem retorno.', to: '/compras/relatorios/pendencias-cotacoes', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.pendencias_cotacoes' },
          { titulo: 'Fornecedores', descricao: 'Ranking por volume, resposta, prazo medio e recorrencia nas cotacoes.', to: '/compras/relatorios/fornecedores', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.fornecedores' },
          { titulo: 'Ciclo de compras', descricao: 'Tempo medio entre solicitacao, cotacao, encerramento e pedido.', to: '/compras/relatorios/ciclo', status: 'Disponivel', permissao: 'comprasCotacoes', componentKey: 'relatorios.compras.ciclo' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: []
      }
    ]
  },
  fiscal: {
    modulo: 'Fiscal',
    titulo: 'Relatorios Fiscais',
    subtitulo: 'Documentos, XMLs, divergencias, eventos e regularidade fiscal por empresa e fornecedor.',
    secoes: [
      {
        titulo: 'Disponiveis',
        itens: [
          { titulo: 'Painel operacional fiscal', descricao: 'Documentos, vinculos confirmados, divergencias abertas e arquivos fiscais por periodo.', to: '/fiscal/relatorios/operacional', status: 'Disponivel', permissao: 'fiscalDocuments', componentKey: 'relatorios.fiscal.operacional' },
          { titulo: 'Documentos fiscais', descricao: 'Caixa de DFe importados e documentos vinculados.', to: '/fiscal/documentos', status: 'Disponivel', permissao: 'fiscalDocuments', componentKey: 'relatorios.fiscal.documentos' },
          { titulo: 'Divergencias fiscais', descricao: 'Pendencias entre fiscal, compras e financeiro.', to: '/fiscal/divergencias', status: 'Disponivel', permissao: 'fiscalDocuments', componentKey: 'relatorios.fiscal.divergencias' },
          { titulo: 'Logs de sincronizacao', descricao: 'Auditoria de chamadas SEFAZ e importacoes manuais.', to: '/fiscal/logs', status: 'Disponivel', permissao: 'fiscalLogs', componentKey: 'relatorios.fiscal.logs' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Documentos sem vinculo', descricao: 'XMLs que ainda precisam de solicitacao, pedido, titulo ou centro de custo.', status: 'Planejado' },
          { titulo: 'Regularidade por fornecedor', descricao: 'Ranking de divergencias e recorrencia fiscal.', status: 'Planejado' }
        ]
      }
    ]
  },
  crm: {
    modulo: 'CRM',
    titulo: 'Relatorios de CRM',
    subtitulo: 'Leads, conversao, atendimento, SLA, carteira e produtividade comercial.',
    secoes: [
      {
        titulo: 'Dashboards disponiveis',
        itens: [
          { titulo: 'Executivo CRM', descricao: 'Consolida conversao, carteira, SLA e distribuicao para leitura da diretoria.', to: '/crm/relatorios/executivo', status: 'Disponivel', permissao: 'crmDashboard', componentKey: 'relatorios.crm.executivo' },
          { titulo: 'Dashboard CRM', descricao: 'Visao principal de leads e atividades.', to: '/crm/dashboard', status: 'Disponivel', permissao: 'crmDashboard', componentKey: 'relatorios.crm.dashboard' },
          { titulo: 'Gerencial', descricao: 'Indicadores gerenciais de carteira e conversao.', to: '/crm/dashboard-gerencial', status: 'Disponivel', permissao: 'crmDashboard', componentKey: 'relatorios.crm.gerencial' },
          { titulo: 'SLA', descricao: 'Tempo de atendimento, atraso e cumprimento de prazos.', to: '/crm/dashboard-sla', status: 'Disponivel', permissao: 'crmDashboard', componentKey: 'relatorios.crm.sla' },
          { titulo: 'Distribuicao', descricao: 'Distribuicao de leads e carga por responsavel.', to: '/crm/dashboard-distribuicao', status: 'Disponivel', permissao: 'crmDashboard', componentKey: 'relatorios.crm.distribuicao' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Funil de conversao', descricao: 'Conversao por etapa, origem, canal e responsavel.', status: 'Planejado' },
          { titulo: 'Produtividade comercial', descricao: 'Tarefas, contatos, contratos gerados e perdas.', status: 'Planejado' }
        ]
      }
    ]
  },
  comercial: {
    modulo: 'Comercial',
    titulo: 'Relatorios Comerciais',
    subtitulo: 'Empreendimentos, unidades, contratos de venda, estoque, VGV e evolucao comercial.',
    secoes: [
      {
        titulo: 'Disponiveis',
        itens: [
          { titulo: 'Painel comercial operacional', descricao: 'Contratos, VGV, unidades, estoque e documentos por empreendimento e obra.', to: '/comercial/relatorios/operacional', status: 'Disponivel', permissao: 'comercialContratos', componentKey: 'relatorios.comercial.operacional' },
          { titulo: 'Mapa de unidades', descricao: 'Estoque comercial e situacao das unidades.', to: '/comercial/mapa-unidades', status: 'Disponivel', permissao: 'comercialEmpreendimentos', componentKey: 'relatorios.comercial.mapa_unidades' },
          { titulo: 'Contratos de venda', descricao: 'Carteira de contratos e situacao comercial.', to: '/comercial/contratos', status: 'Disponivel', permissao: 'comercialContratos', componentKey: 'relatorios.comercial.contratos' },
          { titulo: 'Tabelas de preco', descricao: 'Precos por empreendimento e unidade.', to: '/comercial/tabelas-preco', status: 'Disponivel', permissao: 'comercialEmpreendimentos', componentKey: 'relatorios.comercial.tabelas_preco' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'VGV vendido x estoque', descricao: 'Resultado comercial por empreendimento e fase.', status: 'Planejado' },
          { titulo: 'Distratos e trocas', descricao: 'Eventos comerciais que afetam receita e carteira.', status: 'Planejado' }
        ]
      }
    ]
  },
  provisionamento: {
    modulo: 'Provisionamento',
    titulo: 'Relatorios de Provisionamento',
    subtitulo: 'Previsoes financeiras, compromissos futuros, categorias macro e impacto de caixa.',
    secoes: [
      {
        titulo: 'Disponiveis',
        itens: [
          { titulo: 'Painel operacional', descricao: 'Pressao futura, vencidos nao tratados, prioridades e concentracao por obra e categoria.', to: '/provisoes-financeiras/relatorios/operacional', status: 'Disponivel', permissao: 'provisoesDashboard', componentKey: 'relatorios.provisionamento.operacional' },
          { titulo: 'Dashboard de previsao', descricao: 'Resumo gerencial das provisoes financeiras.', to: '/provisoes-financeiras/dashboard', status: 'Disponivel', permissao: 'provisoesDashboard', componentKey: 'relatorios.provisionamento.dashboard' },
          { titulo: 'Provisionamentos', descricao: 'Lista analitica de provisoes e status.', to: '/provisoes-financeiras', status: 'Disponivel', permissao: 'provisoesLista', componentKey: 'relatorios.provisionamento.lista' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Integracao com fluxo consolidado', descricao: 'Comparar provisao, titulo financeiro e baixa efetiva no fluxo de caixa.', status: 'Planejado' },
          { titulo: 'Empresa do grupo', descricao: 'Separar provisoes por empresa quando a obra/centro estiver plenamente vinculada.', status: 'Planejado' }
        ]
      }
    ]
  },
  rhdp: {
    modulo: 'RH/DP',
    titulo: 'Relatorios de RH/DP',
    subtitulo: 'Colaboradores, documentos, importacoes, apuracoes, fechamentos e obrigacoes.',
    secoes: [
      {
        titulo: 'Disponiveis',
        itens: [
          { titulo: 'Painel operacional RH/DP', descricao: 'Headcount, documentos criticos, apuracoes, fechamentos e base cadastrada.', to: '/rh-dp/relatorios/operacional', status: 'Disponivel', permissao: 'rhDpColaboradores', componentKey: 'relatorios.rhdp.operacional' },
          { titulo: 'Apuracao', descricao: 'Pre-folha, eventos e ajustes por competencia.', to: '/rh-dp/apuracao', status: 'Disponivel', permissao: 'rhDpApuracao', componentKey: 'relatorios.rhdp.apuracao' },
          { titulo: 'Fechamentos', descricao: 'Competencias fechadas e titulos gerados ao financeiro.', to: '/rh-dp/fechamentos', status: 'Disponivel', permissao: 'rhDpObrigacoes', componentKey: 'relatorios.rhdp.fechamentos' },
          { titulo: 'Importacoes', descricao: 'Historico de importacoes e lotes processados.', to: '/rh-dp/importacoes', status: 'Disponivel', permissao: 'rhDpImportacoes', componentKey: 'relatorios.rhdp.importacoes' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Obrigacoes por vencimento', descricao: 'Agenda gerencial de pagamentos e obrigacoes de DP.', status: 'Planejado' },
          { titulo: 'Custo de mao de obra', descricao: 'Custo por empresa, obra, centro de custo e tipo de vinculo.', status: 'Planejado' }
        ]
      }
    ]
  },
  contratos: {
    modulo: 'Contratos',
    titulo: 'Relatorios de Contratos',
    subtitulo: 'Contratos vinculados a solicitacoes, prazos, vencimentos, valores e documentos.',
    secoes: [
      {
        titulo: 'Disponiveis',
        itens: [
          { titulo: 'Painel operacional de contratos', descricao: 'Contratos por status, empresa, obra/centro, valores, saldos e pendencias cadastrais.', to: '/contratos/relatorios/operacional', status: 'Disponivel', permissao: 'contratos', componentKey: 'relatorios.contratos.operacional' },
          { titulo: 'Gestao de contratos', descricao: 'Base operacional de contratos, anexos e vinculos.', to: '/gestao-contratos', status: 'Disponivel', permissao: 'contratos', componentKey: 'relatorios.contratos.gestao' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Contratos a vencer', descricao: 'Prazos, renovacoes, reajustes e alertas por responsavel apos cadastro estruturado de vencimento.', status: 'Planejado' },
          { titulo: 'Saldo contratual detalhado', descricao: 'Abertura dos compromissos por contrato, solicitacao vinculada e comprovantes.', status: 'Planejado' }
        ]
      }
    ]
  }
};

function ReportCard({ item }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{item.titulo}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          item.to ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {item.status}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{item.descricao}</p>
    </>
  );

  if (!item.to) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
    >
      {content}
    </Link>
  );
}

export default function ModuloRelatorios({ modulo }) {
  const { user } = useAuth();
  const { isVisible } = useUiVisibility();
  const hub = HUBS[modulo] || HUBS.solicitacoes;
  const podeVerItem = (item) => {
    if (item.componentKey && !isVisible(item.componentKey)) {
      return false;
    }

    if (item.permissao) {
      const check = PERMISSIONS[item.permissao];
      if (typeof check === 'function' && !check(user)) {
        return false;
      }
    }

    if (item.permissaoKey) {
      return hasPermissao(user, item.permissaoKey);
    }

    return true;
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-sky-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(239,246,255,0.9))] px-6 py-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{hub.modulo}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{hub.titulo}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{hub.subtitulo}</p>
      </section>

      {hub.secoes.map((secao) => (
        <section key={secao.titulo} className="sol-surface-card rounded-lg p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{secao.titulo}</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {secao.itens.filter(podeVerItem).length} visoes
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {secao.itens.filter(podeVerItem).map((item) => (
              <ReportCard key={item.titulo} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
