import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  arquivarConversasEmMassa,
  desarquivarConversasEmMassa,
  getCaixaSaida
} from '../services/conversasInternas';
import { useAuth } from '../contexts/AuthContext';
import { TabelaPadrao } from '../components/padrao';

function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR');
}

function alternarSelecionado(lista, id) {
  if (lista.includes(id)) return lista.filter((item) => item !== id);
  return [...lista, id];
}

export default function ConversasSaida() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('ABERTAS');
  const [selecionadas, setSelecionadas] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limitePorPagina, setLimitePorPagina] = useState(20);
  const [metaPaginacao, setMetaPaginacao] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });

  const arquivadas = aba === 'ARQUIVADAS';

  async function carregar() {
    try {
      setLoading(true);
      const data = await getCaixaSaida({
        arquivadas,
        page: paginaAtual,
        limit: limitePorPagina
      });
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setItens(lista);
      setMetaPaginacao({
        page: Number(data?.meta?.page || paginaAtual),
        limit: Number(data?.meta?.limit || limitePorPagina),
        total: Number(data?.meta?.total || lista.length),
        total_pages: Number(data?.meta?.total_pages || (lista.length > 0 ? 1 : 0))
      });
      setSelecionadas([]);
      if (!arquivadas) {
        const userId = Number(user?.id);
        if (Number.isInteger(userId) && userId > 0) {
          localStorage.setItem(`conversas_saida_last_seen_${userId}`, new Date().toISOString());
          window.dispatchEvent(new Event('conversas:saida:seen'));
        }
      }
    } catch (error) {
      alert(error?.message || 'Erro ao carregar caixa de saída');
    } finally {
      setLoading(false);
    }
  }

  async function arquivarOuDesarquivarEmMassa() {
    if (selecionadas.length === 0) {
      alert('Selecione ao menos uma conversa.');
      return;
    }
    try {
      if (arquivadas) {
        await desarquivarConversasEmMassa(selecionadas);
        alert('Conversas desarquivadas com sucesso.');
      } else {
        await arquivarConversasEmMassa(selecionadas);
        alert('Conversas arquivadas com sucesso.');
      }
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao processar arquivamento em massa');
    }
  }

  async function arquivarOuDesarquivarIndividual(conversaId) {
    try {
      if (arquivadas) {
        await desarquivarConversasEmMassa([conversaId]);
        alert('Conversa desarquivada com sucesso.');
      } else {
        await arquivarConversasEmMassa([conversaId]);
        alert('Conversa arquivada com sucesso.');
      }
      await carregar();
    } catch (error) {
      alert(error?.message || 'Erro ao processar conversa');
    }
  }

  useEffect(() => {
    setPaginaAtual(1);
  }, [aba, limitePorPagina]);

  useEffect(() => {
    carregar();
  }, [aba, user?.id, paginaAtual, limitePorPagina]);

  const totalRegistros = Number(metaPaginacao.total || 0);
  const totalPaginas = Number(metaPaginacao.total_pages || 0);
  const paginaInicial = totalRegistros === 0 ? 0 : ((paginaAtual - 1) * limitePorPagina) + 1;
  const paginaFinal = totalRegistros === 0 ? 0 : Math.min(totalRegistros, paginaAtual * limitePorPagina);

  return (
    <div className="page solicitacoes-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Caixa de Saída</h1>
          <p className="page-subtitle">Conversas enviadas por você.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-outline" onClick={carregar}>Atualizar</button>
          <button type="button" className="btn btn-outline" onClick={arquivarOuDesarquivarEmMassa}>
            {arquivadas ? 'Desarquivar em massa' : 'Arquivar em massa'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <button type="button" className={`btn ${aba === 'ABERTAS' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAba('ABERTAS')}>
            Abertas
          </button>
          <button type="button" className={`btn ${aba === 'ARQUIVADAS' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAba('ARQUIVADAS')}>
            Arquivadas
          </button>
        </div>

        <TabelaPadrao
          colunas={[
            {
              id: 'assunto',
              titulo: 'Assunto',
              // R17: o assunto é o que nomeia a conversa na lista.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => item.assunto
            },
            {
              id: 'destinatario',
              titulo: 'Destinatário',
              tipo: 'texto',
              render: (item) => item.destinatario?.nome || '-'
            },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => item.status },
            {
              id: 'ultima_mensagem',
              titulo: 'Última mensagem',
              tipo: 'texto',
              render: (item) => item.ultima_mensagem?.mensagem || '-'
            },
            { id: 'anexos', titulo: 'Anexos', tipo: 'numero', render: (item) => item.anexos_total ?? 0 },
            {
              id: 'participantes',
              titulo: 'Participantes',
              tipo: 'numero',
              render: (item) => item.participantes_total ?? 0
            },
            {
              id: 'atualizado_em',
              titulo: 'Atualizado em',
              tipo: 'data',
              render: (item) => formatarDataHora(item.updatedAt)
            }
          ]}
          itens={itens}
          carregando={loading}
          storageKey="tabela:conversas-saida"
          rotuloRolagem="Conversas enviadas"
          vazio="Nenhuma conversa nesta aba."
          selecao={{
            selecionados: selecionadas,
            aoAlternar: (id) => setSelecionadas((prev) => alternarSelecionado(prev, id)),
            aoAlternarTodos: (marcar, ids) => setSelecionadas(marcar ? ids : [])
          }}
          acoesLinha={(item) => (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => navigate(`/conversas/${item.id}`, { state: { origemConversa: 'saida' } })}
              >
                Abrir chat
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => arquivarOuDesarquivarIndividual(item.id)}
              >
                {arquivadas ? 'Desarquivar' : 'Arquivar'}
              </button>
            </>
          )}
        />

        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-[var(--c-muted)]">
            {totalRegistros > 0
              ? `Exibindo ${paginaInicial}-${paginaFinal} de ${totalRegistros} conversas`
              : 'Nenhuma conversa nesta aba.'}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span>Por página</span>
              <select
                className="input !w-auto min-w-[88px]"
                value={limitePorPagina}
                onChange={(e) => setLimitePorPagina(Number(e.target.value) || 20)}
              >
                {[10, 20, 50, 100].map((opcao) => (
                  <option key={opcao} value={opcao}>{opcao}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                disabled={paginaAtual <= 1}
              >
                Anterior
              </button>
              <span className="text-sm min-w-[96px] text-center">
                Página {paginaAtual} de {Math.max(totalPaginas, 1)}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPaginaAtual((prev) => Math.min(Math.max(totalPaginas, 1), prev + 1))}
                disabled={totalPaginas === 0 || paginaAtual >= totalPaginas}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
