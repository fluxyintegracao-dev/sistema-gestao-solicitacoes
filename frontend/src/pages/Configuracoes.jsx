import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  hasEnabledModule,
  isBusinessAdmin,
  isSuperadmin
} from '../utils/acessoProduto';

const SECOES_CONFIG = [
  {
    title: 'Cadastros',
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
    title: 'Compras',
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
        requireModule: 'BIBLIOTECA_MODELOS'
      }
    ]
  },
  {
    title: 'Comercial',
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
    title: 'Status e Vinculos',
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
        to: '/cores-sistema'
      },
      {
        title: 'Areas Visiveis para OBRA',
        description: 'Controle as areas visiveis na nova solicitacao.',
        to: '/areas-obra'
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
        title: 'Aprovacao por Diretoria',
        description: 'Configure a diretoria que recebe primeiro as solicitacoes conforme a classificacao da obra.',
        to: '/aprovacao-diretoria'
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
        title: 'Permissoes RH/DP e SIENGE',
        description: 'Defina, por usuario, quais areas do RH/DP e da Integracao SIENGE podem ser operadas pela equipe de RH e contabilidade.',
        to: '/usuarios-permissoes-rh-dp'
      },
      {
        title: 'Permissoes de Areas por Usuario',
        description: 'Configure quais areas, abas e acoes de cada modulo cada usuario pode acessar. Ideal para restringir acesso sem criar perfis novos.',
        to: '/permissoes-areas'
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
    requireSuperadmin: true,
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
    .filter((secao) => !secao.requireSuperadmin || superadmin)
    .map((secao) => ({
      ...secao,
      itens: secao.itens.filter((item) => {
        if (item.requireSuperadmin && !superadmin) return false;
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
        <h1 className="config-page-title">Configuracoes</h1>
        <p className="config-page-subtitle">
          Gerencie cadastros, regras operacionais e, quando aplicavel, a camada de modulos da instalacao.
        </p>
      </header>

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
