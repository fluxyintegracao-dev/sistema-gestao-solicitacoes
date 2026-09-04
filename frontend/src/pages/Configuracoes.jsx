import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  canManageConfiguracoesArea,
  hasEnabledModule,
  isBusinessAdmin,
  isSuperadmin
} from '../utils/acessoProduto';

const SECOES_CONFIG = [
  {
    title: 'Cadastros',
    permissionArea: 'cadastros',
    itens: [
      {
        title: 'Obras',
        description: 'Cadastro e manutencao basica de obras usadas no modulo de solicitacoes.',
        to: '/obras'
      },
      {
        title: 'Setores',
        description: 'Cadastro e manutencao de setores.',
        to: '/setores'
      },
      {
        title: 'Tipos (Macro)',
        description: 'Cadastro dos tipos macro.',
        to: '/tipos-solicitacao'
      },
      {
        title: 'Cadastro de Pessoas',
        description: 'Cadastro mestre de clientes, credores, fornecedores e corretores.',
        to: '/parceiros'
      },
      {
        title: 'Empresas do Grupo',
        description: 'Cadastro central das empresas usado por financeiro, pagamentos e RH/DP.',
        to: '/empresas-grupo',
        requireSuperadmin: true
      },
      {
        title: 'Categorias de Parceiro',
        description: 'Cadastro de categorias para fornecedores.',
        to: '/parceiros-categorias'
      },
      {
        title: 'Subtipos de Contrato',
        description: 'Cadastro de subtipos.',
        to: '/tipos-sub-contrato'
      },
      {
        title: 'Contratos',
        description: 'Cadastro e manutencao de contratos.',
        to: '/gestao-contratos',
        requireModule: 'CONTRATOS'
      },
      {
        title: 'Cartões de Recarga',
        description: 'Cadastre os cartões Flash e vincule os usuários autorizados a solicitar recarga.',
        to: '/configuracoes-cartoes-recarga',
        requireSuperadmin: true,
        strictSuperadmin: true
      }
    ]
  },
  {
    title: 'Usuarios',
    permissionArea: 'usuarios',
    itens: [
      {
        title: 'Cadastro de Usuarios',
        description: 'Cadastrar e gerenciar usuarios.',
        to: '/usuarios'
      }
    ]
  },
  {
    title: 'Suporte',
    permissionArea: 'aparencia',
    itens: [
      {
        title: 'WhatsApp do Suporte',
        description: 'Configure o numero aberto pelo botao Suporte no topo do sistema.',
        to: '/configuracoes-suporte'
      },
      {
        title: 'Visibilidade de Dashboards e Tabelas',
        description: 'Defina quais cards, dashboards e tabelas ficam visiveis nas telas do sistema.',
        to: '/configuracoes-visibilidade-ui'
      },
      {
        title: 'Notificacoes do Sistema',
        description: 'Defina quais eventos podem gerar avisos no sino por modulo.',
        to: '/configuracoes-notificacoes-sistema'
      }
    ]
  },
  {
    title: 'Compras',
    permissionArea: 'geral',
    itens: [
      {
        title: 'Configuracoes de Cotacao',
        description: 'Defina regras padrao de cotacao e encerramento.',
        to: '/configuracoes-cotacao',
        requireModule: 'COMPRAS'
      },
      {
        title: 'Status dos Pedidos de Compra',
        description: 'Cadastre status operacionais e bloqueios de edicao dos pedidos.',
        to: '/configuracoes-status-pedidos-compra',
        requireModule: 'COMPRAS'
      },
      {
        title: 'Arquivos Modelos',
        description: 'Crie paginas e defina admins com permissao de upload.',
        to: '/arquivos-modelos-config',
        requireSuperadmin: true,
        strictSuperadmin: true,
        requireModule: 'BIBLIOTECA_MODELOS'
      }
    ]
  },
  {
    title: 'Comercial',
    permissionArea: 'geral',
    itens: [
      {
        title: 'Categorias do Contrato de Venda',
        description: 'Defina quais categorias financeiras aparecem no contrato de venda e na comissao.',
        to: '/configuracoes-comercial-categorias',
        requireSuperadmin: true,
        requireModule: 'COMERCIAL'
      }
    ]
  },
  {
    title: 'Provisionamento',
    permissionArea: 'geral',
    itens: [
      {
        title: 'Fluxo do Provisionamento',
        description: 'Configure o modo informativo, controlado ou integrado com solicitacoes.',
        to: '/configuracoes-provisionamento-fluxo',
        requireModule: 'PROVISOES'
      }
    ]
  },
  {
    title: 'Status e Vinculos',
    permissionArea: 'status_vinculos',
    itens: [
      {
        title: 'Status por Setor',
        description: 'Cadastro de status permitidos por setor.',
        to: '/status-setor'
      },
      {
        title: 'Permissoes por Setor',
        description: 'Defina se usuarios podem assumir e atribuir.',
        to: '/permissoes-setor'
      },
      {
        title: 'Cores do Sistema',
        description: 'Defina cores de botoes e status.',
        to: '/cores-sistema',
        permissionArea: 'aparencia'
      },
      {
        title: 'Areas Visiveis para OBRA',
        description: 'Controle as areas visiveis na nova solicitacao.',
        to: '/areas-obra'
      },
      {
        title: 'Apropriacao Padrao por Obra',
        description: 'Defina a apropriacao preenchida automaticamente por obra e tipo de solicitacao.',
        to: '/obra-tipo-apropriacao'
      },
      {
        title: 'Categorias do Contrato de Obra',
        description: 'Selecione quais categorias financeiras aparecem ao criar um contrato de obra.',
        to: '/contrato-obra-categorias',
        // Mesma area do endpoint e da rota: o card nao pode exigir permissao diferente
        // da tela que ele abre.
        permissionArea: 'geral'
      },
      {
        title: 'Areas por Setor de Origem',
        description: 'Defina quais setores cada setor pode selecionar na nova solicitacao.',
        to: '/areas-por-setor-origem'
      },
      {
        title: 'SLA de Solicitacoes por Setor',
        description: 'Defina o prazo real em dias usado no relatorio operacional de solicitacoes.',
        to: '/solicitacoes-sla-setor'
      },
      {
        title: 'Setores Visiveis por Usuario',
        description: 'Defina setores extras que cada usuario pode visualizar sem alterar regras de acao.',
        to: '/setores-visiveis-usuario'
      },
      {
        title: 'Recebimento por Setor',
        description: 'Defina se as solicitacoes chegam primeiro ao admin ou ficam visiveis para todos.',
        to: '/comportamento-recebimento-setor'
      },
      {
        title: 'Tipos por Setor (Recebimento)',
        description: 'Defina tipos por setor e o modo de recebimento para admin ou todos.',
        to: '/tipos-solicitacao-por-setor'
      },
      {
        title: 'Campos da Nova Solicitacao',
        description: 'Defina campos visiveis e obrigatorios por tipo de solicitacao.',
        to: '/nova-solicitacao-campos',
        permissionArea: 'solicitacoes'
      },
      {
        title: 'Formas de Pagamento da Nova Solicitacao',
        description: 'Escolha as formas exibidas em contratos e nos demais tipos de solicitacao.',
        to: '/configuracoes-formas-pagamento-solicitacao',
        permissionArea: 'geral'
      },
      {
        /*
          DOIS DESTINOS, NAO UMA ROTA SOBRANDO (04/09).

          Esta entrada e a de cima levam ao MESMO componente, e por um tempo
          eu tratei a de baixo como duplicata para remover. Nao e: a tela le
          o pathname e anuncia assunto diferente conforme o caminho — titulo,
          descricao e qual bloco recebe a barra de cor. Se a tela muda o que
          diz que é conforme a porta, sao duas portas de verdade, e o que
          faltava era a segunda.

          O rotulo nomeia o ASSUNTO QUE A PORTA ABRE, nao o arquivo que ela
          carrega: quem clica precisa saber o que vai encontrar antes de
          chegar. Os quatro blocos continuam visiveis nas duas — a diferenca
          e o que a tela anuncia, nao o que ela esconde.
        */
        title: 'Alertas e Limites do Contrato',
        description: 'Cortes e cores do alerta de saldo do contrato e o limite para analise juridica.',
        to: '/configuracoes-contrato-alertas',
        permissionArea: 'geral'
      },
      {
        title: 'Automacao da Nova Solicitacao',
        description: 'Redirecione tipos de solicitacao para telas especificas mantendo a obra selecionada.',
        to: '/nova-solicitacao-automacao-destino',
        permissionArea: 'solicitacoes'
      },
      {
        title: 'Acesso a Prioridades Diretoria',
        description: 'Defina se o usuario ve todos os lotes de prioridade ou apenas diretorias especificas.',
        to: '/usuarios-acesso-prioridade-diretoria'
      },
      {
        title: 'Tipos Compartilhados entre Setores',
        description: 'Permita visibilidade adicional por tipo sem transferir a area responsavel da solicitacao.',
        to: '/tipos-compartilhados-setor'
      },
      {
        title: 'Automacao por Status',
        description: 'Envie solicitacoes automaticamente para outro setor quando tipo e status forem atingidos.',
        to: '/automacao-status-setor'
      },
      {
        title: 'Envio Livre entre Setores',
        description: 'Defina usuarios autorizados a enviar solicitacoes entre setores fora do fluxo comum.',
        to: '/usuarios-envio-qualquer-setor'
      },
      {
        title: 'Criacao em Todas as Obras',
        description: 'Defina quais setores podem criar solicitacao em qualquer obra.',
        to: '/setores-criacao-todas-obras'
      },
      {
        title: 'Acesso em Todas as Obras',
        description: 'Defina quais setores podem acessar recursos protegidos por obra sem vinculo manual.',
        to: '/setores-acesso-todas-obras'
      },
      {
        title: 'Acesso ao Financeiro',
        description: 'Marque usuarios que devem acessar o modulo financeiro e operar todas as obras nesse modulo.',
        to: '/usuarios-acesso-financeiro',
        requireModule: 'FINANCEIRO'
      },
      {
        title: 'Permissoes por Setor e Perfil',
        description: 'Configure permissões padrão por setor e perfil para aplicar a todos os usuários daquele grupo.',
        to: '/permissoes-areas-padroes',
        permissionArea: 'permissoes'
      },
      {
        title: 'Permissoes de Areas por Usuario',
        description: 'Adicione exceções individuais quando um usuário precisar de permissões além do padrão do setor e perfil.',
        to: '/permissoes-areas',
        permissionArea: 'permissoes'
      },
      {
        /*
          PORTA ABERTA EM 04/09.

          Esta tela existia, tinha rota e guarda de permissao, e nao tinha
          link em lugar nenhum do sistema: chegava quem sabia a URL de cor.
          Ferramenta administrativa de permissao nao pode depender de quem
          lembra o endereco. Fica junto das outras duas telas de permissao
          por usuario, no mesmo grupo e com a mesma area de permissao da
          rota (status_vinculos).
        */
        title: 'Permissoes de RH e DP por Usuario',
        description: 'Marque quais usuarios podem ver e operar cada area de RH e Departamento Pessoal.',
        to: '/usuarios-permissoes-rh-dp',
        requireModule: 'RH_DP'
      },
      {
        title: 'Tempo de Inatividade',
        description: 'Define o tempo para logout automatico por inatividade.',
        to: '/timeout-inatividade'
      }
    ]
  },
  {
    title: 'Instalacao',
    permissionArea: 'modulos',
    itens: [
      {
        title: 'Modulos e Planos',
        description: 'Habilite ou desabilite dominios do produto para compor planos comerciais.',
        to: '/configuracoes-modulos'
      }
    ]
  }
];

export default function Configuracoes() {
  const { user } = useAuth();
  const superadmin = isSuperadmin(user);
  const businessAdmin = isBusinessAdmin(user);

  const secoesVisiveis = SECOES_CONFIG
    .map((secao) => ({
      ...secao,
      itens: secao.itens.filter((item) => {
        const areaPermissao = item.permissionArea || secao.permissionArea || 'geral';
        const podeGerenciarArea = canManageConfiguracoesArea(user, areaPermissao);
        if (item.strictSuperadmin && !superadmin) return false;
        if (secao.requireSuperadmin && !superadmin && !podeGerenciarArea) return false;
        if (secao.permissionArea && !podeGerenciarArea) return false;
        if (item.requireSuperadmin && !superadmin && !podeGerenciarArea) return false;
        if (item.permissionArea && !podeGerenciarArea) return false;
        if (item.requireBusinessAdmin && !businessAdmin) return false;
        if (item.requireModule && !hasEnabledModule(user, item.requireModule, { allowSuperadminBypass: false })) {
          return false;
        }
        return true;
      })
    }))
    .filter((secao) => secao.itens.length > 0);

  return (
    <div className="config-page solicitacoes-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <div className="config-page-header-row">
          <div>
            <h1 className="config-page-title">Configuracoes</h1>
            <p className="config-page-subtitle">
              Gerencie cadastros, regras operacionais e, quando aplicavel, a camada de modulos da instalacao.
            </p>
          </div>
          <div className="config-page-meta">
            <span className="config-section-count">
              {secoesVisiveis.reduce((acc, secao) => acc + secao.itens.length, 0)} atalhos
            </span>
          </div>
        </div>
      </header>

      <section className="config-summary-card">
        <div>
          <p className="config-summary-kicker">Console administrativo</p>
          <h2 className="config-summary-title">Ajustes estruturais do Fluxy</h2>
          <p className="config-summary-copy">
            Todas as rotas abaixo preservam o backend atual e concentram apenas configuracoes operacionais e de acesso.
          </p>
        </div>
      </section>

      {secoesVisiveis.map((secao) => (
        <section key={secao.title} className="config-section">
          <div className="config-section-head">
            <h2 className="config-section-title">{secao.title}</h2>
            <span className="config-section-count">{secao.itens.length} item(ns)</span>
          </div>

          <div className="config-grid">
            {secao.itens.map((item) => (
              <ConfigItem
                key={item.to || item.title}
                title={item.title}
                description={item.description}
                to={item.to}
                disabled={item.disabled}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ConfigItem({ title, description, to, disabled }) {
  if (disabled) {
    return (
      <div className="config-item config-item-disabled" aria-disabled="true">
        <h3 className="config-item-title">{title}</h3>
        <p className="config-item-description">{description}</p>
      </div>
    );
  }

  return (
    <Link to={to} className="config-item">
      <h3 className="config-item-title">{title}</h3>
      <p className="config-item-description">{description}</p>
    </Link>
  );
}
