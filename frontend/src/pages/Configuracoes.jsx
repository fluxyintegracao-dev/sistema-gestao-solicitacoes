import { Link } from 'react-router-dom';

const SECOES_CONFIG = [
  {
    title: 'Cadastros',
    itens: [
      {
        title: 'Obras',
        description: 'Cadastro e manutenção de obras.',
        to: '/obras'
      },
      {
        title: 'Setores',
        description: 'Cadastro e manutenção de setores.',
        to: '/setores'
      },
      {
        title: 'Cargos',
        description: 'Cadastro e manutenção de cargos.',
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
        description: 'Cadastro e manutenção de contratos.',
        to: '/gestao-contratos'
      }
    ]
  },
  {
    title: 'Usuários',
    itens: [
      {
        title: 'Cadastro de Usuários',
        description: 'Cadastrar e gerenciar usuários.',
        to: '/usuarios'
      }
    ]
  },
  {
    title: 'Status e Vínculos',
    itens: [
      {
        title: 'Status por Setor',
        description: 'Cadastro de status permitidos por setor.',
        to: '/status-setor'
      },
      {
        title: 'Permissões por Setor',
        description: 'Defina se usuários podem assumir/atribuir.',
        to: '/permissoes-setor'
      },
      {
        title: 'Cores do Sistema',
        description: 'Defina cores de botões e status.',
        to: '/cores-sistema'
      },
      {
        title: 'Áreas Visíveis para OBRA',
        description: 'Controle as áreas visíveis na nova solicitação.',
        to: '/areas-obra'
      },
      {
        title: 'Áreas por Setor de Origem',
        description: 'Defina quais setores cada setor pode selecionar na nova solicitação.',
        to: '/areas-por-setor-origem'
      },
      {
        title: 'Setores Visíveis por Usuário',
        description: 'Defina setores extras que cada usuário pode visualizar quando atribuído.',
        to: '/setores-visiveis-usuario'
      },
      {
        title: 'Recebimento por Setor',
        description: 'Defina se as solicitações chegam primeiro ao admin ou ficam visíveis para todos.',
        to: '/comportamento-recebimento-setor'
      },
      {
        title: 'Tipos por Setor (Recebimento)',
        description: 'Defina tipos por setor e o modo de recebimento para admin/todos.',
        to: '/tipos-solicitacao-por-setor'
      },
      {
        title: 'Criação em Todas as Obras',
        description: 'Defina quais setores podem criar solicitação em qualquer obra.',
        to: '/setores-criacao-todas-obras'
      },
      {
        title: 'Tempo de Inatividade',
        description: 'Define o tempo para logout automático por inatividade.',
        to: '/timeout-inatividade'
      },
      {
        title: 'Arquivos Modelos',
        description: 'Crie páginas e defina admins com permissão de upload.',
        to: '/arquivos-modelos-config'
      }
    ]
  }
];

export default function Configuracoes() {
  return (
    <div className="config-page space-y-5 md:space-y-6">
      <header className="config-page-header">
        <h1 className="config-page-title">Configurações</h1>
        <p className="config-page-subtitle">
          Gerencie cadastros e regras globais do sistema em um único lugar.
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
