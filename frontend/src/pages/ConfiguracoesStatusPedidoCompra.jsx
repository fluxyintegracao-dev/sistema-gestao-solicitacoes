import { useEffect, useState } from 'react';
import {
  getStatusPedidosCompra,
  salvarStatusPedidosCompra
} from '../services/configuracoesSistema';

const EXEMPLOS_STATUS = [
  'ABERTO',
  'EM_ANALISE',
  'ENVIADO_FORNECEDOR',
  'NEGOCIACAO',
  'FECHADO_FORNECEDOR',
  'CANCELADO'
];

function criarNovoStatus() {
  return {
    codigo: '',
    nome: '',
    cor: '#2563eb',
    bloqueia_edicao: false,
    ativo: true,
    novo: true
  };
}

export default function ConfiguracoesStatusPedidoCompra() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      const data = await getStatusPedidosCompra();
      setStatuses(
        (Array.isArray(data?.statuses) ? data.statuses : []).map((item) => ({
          ...item,
          novo: false
        }))
      );
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar status dos pedidos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function atualizarStatus(index, campo, valor) {
    setStatuses((atual) =>
      atual.map((item, idx) => (idx === index ? { ...item, [campo]: valor } : item))
    );
  }

  function adicionarStatus() {
    setStatuses((atual) => [...atual, criarNovoStatus()]);
  }

  function removerStatus(index) {
    setStatuses((atual) => atual.filter((_, idx) => idx !== index));
  }

  async function handleSalvar(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      const payload = {
        statuses: statuses.map(({ codigo, nome, cor, bloqueia_edicao, ativo }) => ({
          codigo,
          nome,
          cor,
          bloqueia_edicao,
          ativo
        }))
      };

      const response = await salvarStatusPedidosCompra(payload);
      setStatuses(
        (Array.isArray(response?.statuses) ? response.statuses : []).map((item) => ({
          ...item,
          novo: false
        }))
      );
      alert('Status dos pedidos salvos com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar status dos pedidos');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <div className="card py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Status dos Pedidos de Compra</h1>
          <p className="page-subtitle">
            Cadastre os status operacionais do pedido. Status marcados com bloqueio impedem ajuste de itens e deixam a compra congelada ate nova mudanca de status.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={adicionarStatus}>
          Novo status
        </button>
      </div>

      <div className="card">
        <div className="text-sm text-[var(--c-muted)]">
          Exemplos recomendados: {EXEMPLOS_STATUS.join(' · ')}
        </div>
      </div>

      <form onSubmit={handleSalvar}>
        <div className="card grid gap-4">
          {statuses.map((status, index) => (
            <div key={`${status.codigo || 'novo'}-${index}`} className="rounded-2xl border border-[var(--c-border)] p-4">
              <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_160px_auto]">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Codigo</label>
                  <input
                    className="input"
                    value={status.codigo || ''}
                    onChange={(event) => atualizarStatus(index, 'codigo', event.target.value.toUpperCase())}
                    disabled={!status.novo}
                    placeholder="EX.: FECHADO_FORNECEDOR"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Nome exibido</label>
                  <input
                    className="input"
                    value={status.nome || ''}
                    onChange={(event) => atualizarStatus(index, 'nome', event.target.value)}
                    placeholder="Ex.: Fechado com o fornecedor"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Cor</label>
                  <div className="flex gap-2">
                    <input
                      className="h-11 w-14 rounded-xl border border-[var(--c-border)] bg-transparent px-1"
                      type="color"
                      value={status.cor || '#2563eb'}
                      onChange={(event) => atualizarStatus(index, 'cor', event.target.value)}
                    />
                    <input
                      className="input"
                      value={status.cor || ''}
                      onChange={(event) => atualizarStatus(index, 'cor', event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  {status.novo ? (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => removerStatus(index)}
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(status.ativo)}
                    onChange={(event) => atualizarStatus(index, 'ativo', event.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Status ativo</div>
                    <div className="text-xs text-[var(--c-muted)]">
                      Status inativos deixam de aparecer na troca de status e nos filtros.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(status.bloqueia_edicao)}
                    onChange={(event) => atualizarStatus(index, 'bloqueia_edicao', event.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Bloqueia edicao do pedido</div>
                    <div className="text-xs text-[var(--c-muted)]">
                      Use para status de fechamento, cancelamento ou qualquer etapa em que a compra nao possa mais ser alterada.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar status'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
