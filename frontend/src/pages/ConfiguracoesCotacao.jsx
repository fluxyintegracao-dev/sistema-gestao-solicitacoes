import { useEffect, useState } from 'react';
import { obterConfigCotacoes, salvarConfigCotacoes } from '../services/compras';

const CRITERIOS = [
  { value: 'menor_total', label: 'Menor total da proposta' },
  { value: 'menor_item', label: 'Menor preco por item' },
  { value: 'fornecedor_preferencial', label: 'Fornecedor preferencial' }
];

export default function ConfiguracoesCotacao() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      const data = await obterConfigCotacoes();
      setConfig(data || {});
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar configuracoes de cotacoes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function atualizar(campo, valor) {
    setConfig((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSalvar(event) {
    event.preventDefault();
    try {
      setSalvando(true);
      await salvarConfigCotacoes(config);
      alert('Configuracoes de cotacoes salvas com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar configuracoes');
    } finally {
      setSalvando(false);
    }
  }

  if (loading || !config) {
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
          <h1 className="page-title">Configuracoes de Cotacoes</h1>
          <p className="page-subtitle">Regras padrao para o modulo de cotacoes (RFQ). Apenas SUPERADMIN pode alterar.</p>
        </div>
      </div>

      <form onSubmit={handleSalvar}>
        <div className="card grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Minimo de cotacoes exigidas</label>
            <input
              className="input max-w-xs"
              type="number"
              min="1"
              max="10"
              value={config.min_cotacoes ?? 3}
              onChange={(event) => atualizar('min_cotacoes', Number(event.target.value))}
            />
            <p className="text-xs text-[var(--c-muted)]">
              Numero minimo de respostas para encerrar uma cotacao sem justificativa.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Criterio de vencedor padrao</label>
            <select
              className="input max-w-xs"
              value={config.criterio_vencedor ?? 'menor_total'}
              onChange={(event) => atualizar('criterio_vencedor', event.target.value)}
            >
              {CRITERIOS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--c-muted)]">
              Criterio utilizado como referencia na comparacao de propostas.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Prazo de resposta padrao (dias)</label>
            <input
              className="input max-w-xs"
              type="number"
              min="1"
              max="90"
              value={config.prazo_resposta_padrao_dias ?? 5}
              onChange={(event) => atualizar('prazo_resposta_padrao_dias', Number(event.target.value))}
            />
            <p className="text-xs text-[var(--c-muted)]">
              Dias corridos a partir do envio para o fornecedor responder.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(config.permitir_aprovar_sem_minimo)}
                onChange={(event) => atualizar('permitir_aprovar_sem_minimo', event.target.checked)}
              />
              <div>
                <div className="text-sm font-medium">Permitir aprovar sem atingir o minimo de cotacoes</div>
                <div className="text-xs text-[var(--c-muted)]">
                  O responsavel pode encerrar mesmo com menos respostas do que o minimo, mediante justificativa.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(config.exigir_justificativa_se_nao_menor_preco)}
                onChange={(event) => atualizar('exigir_justificativa_se_nao_menor_preco', event.target.checked)}
              />
              <div>
                <div className="text-sm font-medium">Exigir justificativa se o vencedor nao for o menor preco</div>
                <div className="text-xs text-[var(--c-muted)]">
                  Quando o criterio de selecao divergir do menor preco, o responsavel deve informar a razao.
                </div>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar configuracoes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
