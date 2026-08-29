import { useEffect, useMemo, useState } from 'react';
import PrestacaoRecargaCartao from './PrestacaoRecargaCartao';
import { listarMeusCartoesRecarga, obterContextoCartaoRecarga } from '../../services/recargasCartao';

function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function valorUltimaRecarga(recarga) {
  const valorEfetivo = Number(recarga?.valor_efetivo || 0);
  return valorEfetivo > 0 ? valorEfetivo : Number(recarga?.valor_solicitado || 0);
}

export default function RecargaCartaoFields({ ativo, value, onChange, onContextChange }) {
  const [cartoes, setCartoes] = useState([]);
  const [contexto, setContexto] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!ativo) {
      setCartoes([]);
      setContexto(null);
      setErro('');
      onContextChange?.(null);
      return;
    }
    setCarregando(true);
    listarMeusCartoesRecarga()
      .then((dados) => setCartoes(dados?.cartoes || []))
      .catch((error) => setErro(error.message))
      .finally(() => setCarregando(false));
  }, [ativo, onContextChange]);

  async function carregarContexto(cartaoId) {
    if (!cartaoId) {
      setContexto(null);
      onContextChange?.(null);
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const dados = await obterContextoCartaoRecarga(cartaoId);
      setContexto(dados);
      onContextChange?.(dados);
    } catch (error) {
      setContexto(null);
      onContextChange?.(null);
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (ativo && value) void carregarContexto(value);
  }, [ativo, value]);

  const ultima = contexto?.ultima_recarga || null;
  const rotuloSituacao = useMemo(() => {
    if (!ultima) return 'Sem recarga anterior';
    return ultima.prestacao?.status || ultima.status_ciclo || ultima.titulo?.status || '-';
  }, [ultima]);

  if (!ativo) return null;

  return (
    <section className="md:col-span-2 space-y-3 border-y border-[var(--c-border)] py-3" aria-labelledby="recarga-cartao-heading">
      <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(320px,1.4fr)]">
        <label className="grid gap-1 text-sm">
          <span id="recarga-cartao-heading">Cartão para recarga *</span>
          <select
            className="input input-sm"
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            required
            disabled={carregando && cartoes.length === 0}
          >
            <option value="">{carregando ? 'Carregando cartões...' : 'Selecione um cartão vinculado'}</option>
            {cartoes.map((cartao) => (
              <option key={cartao.id} value={cartao.id}>{cartao.nome} · final {cartao.ultimos_quatro}</option>
            ))}
          </select>
          {!carregando && cartoes.length === 0 ? (
            <span className="text-xs text-amber-700">Nenhum cartão ativo está vinculado ao seu usuário.</span>
          ) : null}
        </label>

        <div className="grid grid-cols-2 gap-x-5 gap-y-1 self-end border-l border-[var(--c-border)] pl-4 text-sm">
          <span className="text-[var(--c-muted)]">Última recarga</span>
          <strong className="text-right tabular-nums text-[var(--c-text)]">{ultima ? moeda(valorUltimaRecarga(ultima)) : '-'}</strong>
          <span className="text-[var(--c-muted)]">Situação</span>
          <strong className="text-right text-[var(--c-text)]">{rotuloSituacao}</strong>
        </div>
      </div>

      {contexto?.bloqueado ? (
        <div className="app-alert app-alert--warning" role="status">
          {contexto.motivo_bloqueio}
        </div>
      ) : null}
      {erro ? <div className="app-alert app-alert--error" role="alert">{erro}</div> : null}

      {ultima?.prestacao && ultima?.solicitacao?.id ? (
        <PrestacaoRecargaCartao
          solicitacaoId={ultima.solicitacao.id}
          contexto={contexto}
          onAtualizado={() => carregarContexto(value)}
        />
      ) : null}
    </section>
  );
}
