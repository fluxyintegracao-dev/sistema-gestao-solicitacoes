import { Link } from 'react-router-dom';

const SECOES_CONFIG = [
  {
    title: 'Cadastros',
    itens: [
      {
        title: 'Obras',
        description: 'Cadastro e manutencao de obras.',
        to: '/obras'
      },
      {
        title: 'Setores',
        description: 'Cadastro e manutencao de setores.',
        to: '/setores'
      },
      {
        title: 'Cargos',
        description: 'Cadastro e manutencao de cargos.',
        to: '/cargos'
      },
      {
        title: 'Tipos (Macro)',
        description: 'Cadastro dos tipos macro.',
        to: '/tipos-solicitacao'
      },
      {
        title: 'Subtipos de Contrato',
        description: 'Cadastro de subtipos.',
        to: '/tipos-sub-contrato'
      },
      {
        title: 'Contratos',
        description: 'Cadastro e manutencao de contratos.',
        to: '/gestao-contratos'
      }
    ]
  },
  {
    title: 'Usuarios',
    itens: [
      {
        title: 'Cadastro de Usuarios',
        description: 'Cadastrar e gerenciar usuarios.',
        to: '/usuarios'
      }
    ]
  },
  {
    title: 'Status e Vinculos',
    itens: [
      {
        title: 'Status por Setor',
        description: 'Cadastro de status permitidos por setor.',
        to: '/status-setor'
      },
      {
        title: 'Permissoes por Setor',
        description: 'Defina se usuarios podem assumir/atribuir.',
        to: '/permissoes-setor'
      },
      {
        title: 'Cores do Sistema',
        description: 'Defina cores de botoes e status.',
        to: '/cores-sistema'
      },
      {
        title: 'Areas Visiveis para OBRA',
        description: 'Controle as areas visiveis na nova solicitacao.',
        to: '/areas-obra'
      },
      {
        title: 'Aprovacao por Diretoria',
        description: 'Defina a diretoria por classificacao da obra e o setor destino apos aprovacao.',
        to: '/aprovacao-diretoria'
      },
      {
        title: 'Areas por Setor de Origem',
        description: 'Defina quais setores cada setor pode selecionar na nova solicitacao.',
        to: '/areas-por-setor-origem'
      },
      {
        title: 'Setores Visiveis por Usuario',
        description: 'Defina setores extras que cada usuario pode visualizar quando atribuido.',
        to: '/setores-visiveis-usuario'
      },
      {
        title: 'Envio Livre entre Setores',
        description: 'Marque usuarios que podem enviar solicitacoes fora do setor atual.',
        to: '/usuarios-envio-qualquer-setor'
      },
      {
        title: 'Recebimento por Setor',
        description: 'Defina se as solicitacoes chegam primeiro ao admin ou ficam visiveis para todos.',
        to: '/comportamento-recebimento-setor'
      },
      {
        title: 'Tipos por Setor (Recebimento)',
        description: 'Defina tipos por setor e o modo de recebimento para admin/todos.',
        to: '/tipos-solicitacao-por-setor'
      },
      {
        title: 'Tipos Compartilhados entre Setores',
        description: 'Defina setores extras que visualizam determinados tipos desde a criacao.',
        to: '/tipos-compartilhados-setor'
      },
      {
        title: 'Automacao por Status',
        description: 'Defina envios automaticos de setor por tipo de solicitacao e status.',
        to: '/automacao-status-setor'
      },
      {
        title: 'Setores sem Alterar Status',
        description: 'Desabilite o botao de alterar status para setores selecionados.',
        to: '/setores-sem-alteracao-status'
      },
      {
        title: 'Criacao em Todas as Obras',
        description: 'Defina quais setores podem criar solicitacao em qualquer obra.',
        to: '/setores-criacao-todas-obras'
      },
      {
        title: 'Tempo de Inatividade',
        description: 'Define o tempo para logout automatico por inatividade.',
        to: '/timeout-inatividade'
      },
      {
        title: 'Arquivos Modelos',
        description: 'Crie paginas e defina admins com permissao de upload.',
        to: '/arquivos-modelos-config'
      }
    ]
  },
  {
    title: 'Modulos',
    itens: [
      {
        title: 'Provisionamento Financeiro',
        description: 'Configura o gate inicial de acesso ao novo modulo de previsao financeira.',
        to: '/provisionamento-financeiro-config'
      }
    ]
  }
];

export default function Configuracoes() {
  return (
    <div className="config-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <h1 className="config-page-title">Configuracoes</h1>
        <p className="config-page-subtitle">
          Gerencie cadastros e regras globais do sistema em um unico lugar.
        </p>
      </header>

      {SECOES_CONFIG.map(secao => (
        <section key={secao.title} className="config-section">
          <div className="config-section-head">
            <h2 className="config-section-title">{secao.title}</h2>
            <span className="config-section-count">{secao.itens.length} item(ns)</span>
          </div>

          <div className="config-grid">
            {secao.itens.map(item => (
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
