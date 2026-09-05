import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './index.css';
import './styles/design-tokens.css';
import './components/lista-avancada/lista-avancada.css';
import './styles/escala.css';
import './styles/componentes-padrao.css';
import './modules/solicitacao-compra/compras-responsive.css';
import './styles/responsive-system.css';
import { Pagina, PageHeader } from './components/padrao';

function Cenario({ id, titulo, contagem, descricao, fix }) {
  return (
    <div className={`layout-shell fluxy-app-shell flex min-h-screen overflow-x-clip ${fix ? 'qa-fix' : ''}`} data-cenario={id}>
      <main className="layout-main flex-1 min-w-0">
        <div className="layout-content-shell compras-responsive-scope">
          <Pagina>
            <PageHeader
              titulo={titulo}
              voltar={{ to: '/compras/relatorios', title: 'Voltar aos relatorios' }}
              contagem={contagem}
              descricao={descricao}
              acaoPrincipal={{ rotulo: 'Atualizar relatorio', onClick: () => {} }}
              secundarias={[{ rotulo: 'Limpar', onClick: () => {} }]}
            />
            <div style={{ height: '2000px' }}>conteudo</div>
          </Pagina>
        </div>
      </main>
    </div>
  );
}

const CENARIOS = [
  { id: 'categorias-insumos', titulo: 'Categorias e Insumos', contagem: '42 categoria(s) no recorte', descricao: 'Valor pedido por categoria, insumo e obra/centro com base nos itens reais dos pedidos de compra. Marque o recorte e clique em Atualizar relatorio.' },
  { id: 'compras-diretas', titulo: 'Compras Diretas', contagem: '128 item(ns) listado(s)', descricao: 'Monitore quem solicita, quais credores atendem, quais itens sao comprados e o volume de compras diretas. Marque o recorte e clique em Atualizar relatorio.' },
  { id: 'evolucao', titulo: 'Evolucao Mensal de Compras', contagem: '12 mes(es) com movimentacao', descricao: 'Curva mensal de pedidos de compra emitidos, valor total, ticket medio e concentracao por obra/centro. Marque o recorte e clique em Atualizar relatorio.' },
  { id: 'evolucao-fix', titulo: 'Evolucao Mensal de Compras', contagem: '12 mes(es) com movimentacao', descricao: 'Curva mensal de pedidos de compra emitidos, valor total, ticket medio e concentracao por obra/centro. Marque o recorte e clique em Atualizar relatorio.', fix: true },
  { id: 'ciclo', titulo: 'Ciclo de Compras', contagem: '37 solicitacao(oes) no recorte', descricao: 'Tempo real do processo entre solicitacao, liberacao, cotacao, encerramento e pedido. Marque o recorte e clique em Atualizar relatorio.' },
  { id: 'compras-fornecedor', titulo: 'Compras por Fornecedor', contagem: '20 fornecedor(es)', descricao: 'Valor efetivamente pedido por fornecedor com base nos pedidos de compra emitidos.' },
  { id: 'fornecedores', titulo: 'Fornecedores', contagem: '20 fornecedor(es)', descricao: 'Analise de participacao, resposta e vitorias por fornecedor no processo de cotacao. Marque o recorte e clique em Atualizar relatorio.' },
  { id: 'economia-cotacoes', titulo: 'Economia em Cotacoes', contagem: 'Compras / Relatorios', descricao: 'Comparacao entre menor preco disponivel e fornecedor vencedor em cotacoes encerradas.' },
];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MemoryRouter>
      <div>
        {CENARIOS.map((c) => <Cenario key={c.id} {...c} />)}
      </div>
    </MemoryRouter>
  </StrictMode>
);

// TESTE DE CORRECAO (temporario)
const styleTag = document.createElement('style');
styleTag.textContent = `
.qa-fix .app-page-header-row > div:first-of-type { flex-basis: 0; }
`;
document.head.appendChild(styleTag);
