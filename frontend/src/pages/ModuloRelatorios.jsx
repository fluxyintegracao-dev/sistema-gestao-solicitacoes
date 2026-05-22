import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  canViewRhDpObrigacoes,
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
  rhDpImportacoes: canExecuteRhDpImportacoes,
  rhDpObrigacoes: canViewRhDpObrigacoes
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
          { titulo: 'Painel operacional', descricao: 'Volume, funil, gargalos e distribuicao por status, setor e obra/centro.', to: '/solicitacoes/relatorios/operacional', status: 'Disponivel' },
          { titulo: 'Solicitacoes abertas', descricao: 'Base operacional para filtros por status, setor, tipo e responsavel.', to: '/solicitacoes', status: 'Disponivel' },
          { titulo: 'Solicitacoes arquivadas', descricao: 'Historico de solicitacoes encerradas ou fora da fila operacional.', to: '/solicitacoes-arquivadas', status: 'Disponivel' },
          { titulo: 'SLA por setor', descricao: 'Tempo medio por etapa, solicitacoes paradas e gargalos por area.', status: 'Planejado' }
        ]
      },
      {
        titulo: 'Gestao',
        itens: [
          { titulo: 'Funil de solicitacoes', descricao: 'Criadas, assumidas, enviadas, aprovadas, concluidas e arquivadas.', status: 'Planejado' },
          { titulo: 'Volume por obra/centro de custo', descricao: 'Demanda operacional por origem de custo.', status: 'Planejado' }
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
          { titulo: 'Auditoria de compras', descricao: 'Acompanhamento administrativo de compras e evidencias do processo.', to: '/compras/relatorios/auditoria', status: 'Disponivel', permissao: 'businessAdmin' },
          { titulo: 'Cotacoes', descricao: 'Lista de cotacoes, status de resposta e encerramento.', to: '/cotacoes', status: 'Disponivel', permissao: 'comprasCotacoes' },
          { titulo: 'Pedidos de compra', descricao: 'Pedidos emitidos, status e detalhamento por fornecedor.', to: '/pedidos-compra', status: 'Disponivel', permissao: 'comprasPedidos' },
          { titulo: 'Economia em cotacoes', descricao: 'Comparativo entre menor preco disponivel e vencedor selecionado.', to: '/compras/relatorios/economia-cotacoes', status: 'Disponivel', permissao: 'comprasCotacoes' },
          { titulo: 'Fornecedores', descricao: 'Ranking por volume, resposta, prazo medio e recorrencia nas cotacoes.', to: '/compras/relatorios/fornecedores', status: 'Disponivel', permissao: 'comprasCotacoes' },
          { titulo: 'Ciclo de compras', descricao: 'Tempo medio entre solicitacao, cotacao, encerramento e pedido.', to: '/compras/relatorios/ciclo', status: 'Disponivel', permissao: 'comprasCotacoes' }
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
          { titulo: 'Documentos fiscais', descricao: 'Caixa de DFe importados e documentos vinculados.', to: '/fiscal/documentos', status: 'Disponivel', permissao: 'fiscalDocuments' },
          { titulo: 'Divergencias fiscais', descricao: 'Pendencias entre fiscal, compras e financeiro.', to: '/fiscal/divergencias', status: 'Disponivel', permissao: 'fiscalDocuments' },
          { titulo: 'Logs de sincronizacao', descricao: 'Auditoria de chamadas SEFAZ e importacoes manuais.', to: '/fiscal/logs', status: 'Disponivel', permissao: 'fiscalLogs' }
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
          { titulo: 'Dashboard CRM', descricao: 'Visao principal de leads e atividades.', to: '/crm/dashboard', status: 'Disponivel', permissao: 'crmDashboard' },
          { titulo: 'Gerencial', descricao: 'Indicadores gerenciais de carteira e conversao.', to: '/crm/dashboard-gerencial', status: 'Disponivel', permissao: 'crmDashboard' },
          { titulo: 'SLA', descricao: 'Tempo de atendimento, atraso e cumprimento de prazos.', to: '/crm/dashboard-sla', status: 'Disponivel', permissao: 'crmDashboard' },
          { titulo: 'Distribuicao', descricao: 'Distribuicao de leads e carga por responsavel.', to: '/crm/dashboard-distribuicao', status: 'Disponivel', permissao: 'crmDashboard' }
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
          { titulo: 'Mapa de unidades', descricao: 'Estoque comercial e situacao das unidades.', to: '/comercial/mapa-unidades', status: 'Disponivel', permissao: 'comercialEmpreendimentos' },
          { titulo: 'Contratos de venda', descricao: 'Carteira de contratos e situacao comercial.', to: '/comercial/contratos', status: 'Disponivel', permissao: 'comercialContratos' },
          { titulo: 'Tabelas de preco', descricao: 'Precos por empreendimento e unidade.', to: '/comercial/tabelas-preco', status: 'Disponivel', permissao: 'comercialEmpreendimentos' }
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
          { titulo: 'Dashboard de previsao', descricao: 'Resumo gerencial das provisoes financeiras.', to: '/provisoes-financeiras/dashboard', status: 'Disponivel', permissao: 'provisoesDashboard' },
          { titulo: 'Provisionamentos', descricao: 'Lista analitica de provisoes e status.', to: '/provisoes-financeiras', status: 'Disponivel', permissao: 'provisoesLista' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Aging de provisoes', descricao: 'Previsoes vencidas, realizadas e pendentes por categoria.', status: 'Planejado' },
          { titulo: 'Impacto projetado no caixa', descricao: 'Provisoes por periodo, obra e empresa do grupo.', status: 'Planejado' }
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
          { titulo: 'Apuracao', descricao: 'Pre-folha, eventos e ajustes por competencia.', to: '/rh-dp/apuracao', status: 'Disponivel', permissao: 'rhDpApuracao' },
          { titulo: 'Fechamentos', descricao: 'Competencias fechadas e titulos gerados ao financeiro.', to: '/rh-dp/fechamentos', status: 'Disponivel', permissao: 'rhDpObrigacoes' },
          { titulo: 'Importacoes', descricao: 'Historico de importacoes e lotes processados.', to: '/rh-dp/importacoes', status: 'Disponivel', permissao: 'rhDpImportacoes' }
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
          { titulo: 'Gestao de contratos', descricao: 'Base operacional de contratos, anexos e vinculos.', to: '/gestao-contratos', status: 'Disponivel', permissao: 'contratos' }
        ]
      },
      {
        titulo: 'Proximas visoes',
        itens: [
          { titulo: 'Contratos a vencer', descricao: 'Prazos, renovacoes, reajustes e alertas por responsavel.', status: 'Planejado' },
          { titulo: 'Contratos por centro de custo', descricao: 'Compromissos contratuais por obra, empresa e fornecedor.', status: 'Planejado' }
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
  const hub = HUBS[modulo] || HUBS.solicitacoes;
  const podeVerItem = (item) => {
    if (!item.permissao) {
      return true;
    }

    const check = PERMISSIONS[item.permissao];
    return typeof check === 'function' ? check(user) : true;
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
