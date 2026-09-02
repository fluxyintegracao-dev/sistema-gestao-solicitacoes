import { useEffect, useState } from 'react';
import PreviewAnexoModal from './SolicitacaoDetalhe/PreviewAnexoModal';
import { TabelaPadrao } from '../components/padrao';
import { fileUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteComprovante } from '../utils/acessoProduto';
import {
  getComprovantesPendentes,
  buscarSolicitacoesParaComprovante,
  vincularComprovante,
  excluirComprovante
} from '../services/comprovantes';

export default function ComprovantesPendentes() {
  const { user } = useAuth();
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [selecionadas, setSelecionadas] = useState({});
  const [buscando, setBuscando] = useState(false);
  const [vinculando, setVinculando] = useState({});
  const [preview, setPreview] = useState(null);
  const podeExcluirComprovante = canDeleteComprovante(user);

  useEffect(() => {
    carregarPendentes();
  }, []);

  async function carregarPendentes() {
    try {
      setLoading(true);
      const data = await getComprovantesPendentes();
      setPendentes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar comprovantes pendentes');
    } finally {
      setLoading(false);
    }
  }

  async function buscarSolicitacoes() {
    try {
      setBuscando(true);
      const data = await buscarSolicitacoesParaComprovante(busca);
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erro ao buscar solicitacoes');
    } finally {
      setBuscando(false);
    }
  }

  async function handleVincular(comprovanteId) {
    const solicitacaoId = selecionadas[comprovanteId];
    if (!solicitacaoId) {
      alert('Selecione uma solicitacao');
      return;
    }

    try {
      setVinculando(prev => ({ ...prev, [comprovanteId]: true }));
      await vincularComprovante(comprovanteId, solicitacaoId);
      setSelecionadas(prev => {
        const next = { ...prev };
        delete next[comprovanteId];
        return next;
      });
      await carregarPendentes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao vincular comprovante');
    } finally {
      setVinculando(prev => ({ ...prev, [comprovanteId]: false }));
    }
  }

  async function handleExcluir(comprovanteId) {
    if (!window.confirm('Deseja excluir este comprovante?')) return;

    try {
      await excluirComprovante(comprovanteId);
      await carregarPendentes();
      alert('Comprovante excluido com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir comprovante');
    }
  }

  async function baixarArquivo(item) {
    try {
      const urlArquivo = fileUrl(item.caminho_arquivo);
      const response = await fetch(urlArquivo);
      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.nome_original || 'comprovante';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Erro ao baixar arquivo');
    }
  }

  return (
    <div className="space-y-6 text-[var(--c-text)]">
      <div className="card">
        <h1 className="page-title">Comprovantes Pendentes</h1>
      </div>

      <div className="card space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>
              Buscar solicitacao (codigo ou descricao)
            </span>
            <input
              className="input"
              placeholder="Ex: SOL-000123 ou Combustivel"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary md:self-end"
            type="button"
            onClick={buscarSolicitacoes}
            disabled={buscando}
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {solicitacoes.length > 0 && (
          <p className="text-sm text-muted">
            {solicitacoes.length} solicitacao(oes) encontradas.
          </p>
        )}
      </div>

      <div className="card">
        <TabelaPadrao
          colunas={[
            {
              id: 'arquivo',
              titulo: 'Visualizacao',
              tipo: 'texto',
              noCard: 'titulo',
              render: (item) => item.nome_original
            },
            {
              id: 'obra',
              titulo: 'Obra',
              tipo: 'texto',
              render: (item) => (
                item.obra?.codigo ? `${item.obra.codigo} - ${item.obra.nome}` : item.obra?.nome || '-'
              )
            },
            {
              id: 'valor',
              titulo: 'Valor',
              tipo: 'valor',
              render: (item) => (
                item.valor
                  ? Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : '-'
              )
            },
            {
              id: 'vincular',
              titulo: 'Vincular a solicitacao',
              tipo: 'texto',
              render: (item) => (
                <select
                  className="input"
                  value={selecionadas[item.id] || ''}
                  onChange={e =>
                    setSelecionadas(prev => ({ ...prev, [item.id]: e.target.value }))
                  }
                >
                  <option value="">Selecione</option>
                  {solicitacoes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} - {s.obra?.codigo ? `${s.obra.codigo} - ` : ''}{s.obra?.nome || ''} {s.descricao ? `| ${s.descricao}` : ''}
                    </option>
                  ))}
                </select>
              )
            },
            {
              id: 'arquivo_acoes',
              titulo: 'Arquivo',
              tipo: 'texto',
              render: (item) => (
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() =>
                      setPreview({
                        nome: item.nome_original,
                        caminho: item.caminho_arquivo
                      })
                    }
                  >
                    Visualizar
                  </button>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => baixarArquivo(item)}
                  >
                    Download
                  </button>
                </div>
              )
            }
          ]}
          itens={pendentes}
          carregando={loading}
          vazio="Nenhum comprovante pendente."
          storageKey="tabela:comprovantes-pendentes"
          rotuloRolagem="Comprovantes pendentes"
          // R17: a identidade deste registro é o NOME DO ARQUIVO do
          // comprovante — exibi-lo em maiúsculas distorceria caixa e
          // extensão; a ausência de coluna 'identidade' fica declarada.
          semIdentidade
          acoesLinha={(item) => (
            <>
              <button
                className="btn btn-primary"
                onClick={() => handleVincular(item.id)}
                disabled={vinculando[item.id]}
              >
                {vinculando[item.id] ? 'Vinculando...' : 'Vincular'}
              </button>
              {podeExcluirComprovante && (
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={() => handleExcluir(item.id)}
                >
                  Excluir
                </button>
              )}
            </>
          )}
          larguraAcoes={240}
        />
      </div>

      {preview && (
        <PreviewAnexoModal
          anexo={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
