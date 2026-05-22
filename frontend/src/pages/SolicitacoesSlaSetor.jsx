import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import {
  getSlaSolicitacoesSetor,
  salvarSlaSolicitacoesSetor
} from '../services/configuracoesSistema';

function normalizeSetor(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

export default function SolicitacoesSlaSetor() {
  const [setores, setSetores] = useState([]);
  const [regras, setRegras] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [setoresData, config] = await Promise.all([
          getSetores(),
          getSlaSolicitacoesSetor()
        ]);

        setSetores(Array.isArray(setoresData) ? setoresData.filter((item) => item?.ativo !== false) : []);
        setRegras(config?.setores && typeof config.setores === 'object' ? config.setores : {});
      } catch (error) {
        console.error(error);
        setMensagem(error.message || 'Erro ao carregar configuracao de SLA.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const setoresOrdenados = useMemo(() => (
    [...setores].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'))
  ), [setores]);

  const resumo = useMemo(() => {
    const ativos = Object.values(regras || {}).filter((regra) => regra?.ativo && Number(regra?.dias) > 0).length;
    return {
      setores: setoresOrdenados.length,
      configurados: ativos,
      pendentes: Math.max(0, setoresOrdenados.length - ativos)
    };
  }, [regras, setoresOrdenados]);

  function atualizarRegra(codigo, patch) {
    const key = normalizeSetor(codigo);
    if (!key) return;

    setRegras((prev) => ({
      ...prev,
      [key]: {
        dias: prev?.[key]?.dias || '',
        ativo: prev?.[key]?.ativo !== false,
        ...patch
      }
    }));
  }

  async function salvar() {
    try {
      setSalvando(true);
      setMensagem('');
      await salvarSlaSolicitacoesSetor({ setores: regras });
      setMensagem('SLA por setor salvo com sucesso.');
    } catch (error) {
      console.error(error);
      setMensagem(error.message || 'Erro ao salvar SLA por setor.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--c-muted)]">Solicitacoes</p>
          <h1 className="page-title">SLA por setor</h1>
          <p className="page-subtitle">
            Defina o prazo real, em dias, que cada setor possui para movimentar solicitacoes abertas.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando || loading}>
          {salvando ? 'Salvando...' : 'Salvar SLA'}
        </button>
      </div>

      {mensagem && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {mensagem}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-muted)]">Setores ativos</p>
          <strong className="mt-2 block text-2xl text-[var(--c-text)]">{resumo.setores}</strong>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-muted)]">Com SLA</p>
          <strong className="mt-2 block text-2xl text-emerald-700">{resumo.configurados}</strong>
        </div>
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--c-muted)]">Pendentes</p>
          <strong className="mt-2 block text-2xl text-amber-700">{resumo.pendentes}</strong>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--c-text)]">Prazos operacionais</h2>
          <p className="page-subtitle">
            Setores sem prazo cadastrado nao entram como vencidos no relatorio. Eles aparecem separadamente como sem SLA configurado.
          </p>
        </div>

        {loading ? (
          <div className="app-empty-card">Carregando setores...</div>
        ) : setoresOrdenados.length === 0 ? (
          <div className="app-empty-card">Nenhum setor ativo encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--c-muted)]">
                <tr>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">SLA em dias</th>
                  <th className="px-4 py-3">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {setoresOrdenados.map((setor) => {
                  const codigo = normalizeSetor(setor.codigo || setor.nome);
                  const regra = regras?.[codigo] || {};
                  return (
                    <tr key={setor.id || codigo} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-[var(--c-text)]">{setor.nome || '-'}</td>
                      <td className="px-4 py-3 text-[var(--c-muted)]">{codigo}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="input max-w-[140px]"
                          value={regra.dias ?? ''}
                          placeholder="Ex: 3"
                          onChange={(event) => atualizarRegra(codigo, { dias: event.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
                          <input
                            type="checkbox"
                            checked={regra.ativo !== false}
                            onChange={(event) => atualizarRegra(codigo, { ativo: event.target.checked })}
                          />
                          Usar no relatorio
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
