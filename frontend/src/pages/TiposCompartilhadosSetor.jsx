import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import {
  getTiposCompartilhadosSetor,
  salvarTiposCompartilhadosSetor
} from '../services/configuracoesSistema';

function normalizarSetorToken(setor) {
  return String(setor?.codigo || setor?.nome || setor?.id || '').trim().toUpperCase();
}

export default function TiposCompartilhadosSetor() {
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [regras, setRegras] = useState({});
  const [setorOrigem, setSetorOrigem] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [setoresData, tiposData, configuracao] = await Promise.all([
          getSetores(),
          getTiposSolicitacao(),
          getTiposCompartilhadosSetor()
        ]);
        const setoresAtivos = Array.isArray(setoresData)
          ? setoresData.filter(item => item?.ativo !== false)
          : [];
        const ordenados = setoresAtivos.sort((a, b) =>
          String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
        );
        setSetores(ordenados);
        setTipos(Array.isArray(tiposData) ? tiposData : []);
        setRegras(configuracao?.regras && typeof configuracao.regras === 'object' ? configuracao.regras : {});
        if (ordenados.length > 0) setSetorOrigem(normalizarSetorToken(ordenados[0]));
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar configuracao de tipos compartilhados.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const tiposOrdenados = useMemo(() => (
    [...tipos].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'))
  ), [tipos]);

  const regraAtual = regras?.[setorOrigem] && typeof regras[setorOrigem] === 'object'
    ? regras[setorOrigem]
    : {};

  function alternar(tipoId, setorToken) {
    const chaveTipo = String(tipoId);
    const token = String(setorToken || '').trim().toUpperCase();

    setRegras(prev => {
      const regraOrigem = prev?.[setorOrigem] && typeof prev[setorOrigem] === 'object'
        ? { ...prev[setorOrigem] }
        : {};
      const selecionados = new Set(Array.isArray(regraOrigem[chaveTipo]) ? regraOrigem[chaveTipo] : []);

      if (selecionados.has(token)) selecionados.delete(token);
      else selecionados.add(token);

      const novaLista = Array.from(selecionados).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      if (novaLista.length) regraOrigem[chaveTipo] = novaLista;
      else delete regraOrigem[chaveTipo];

      const next = { ...prev };
      if (Object.keys(regraOrigem).length) next[setorOrigem] = regraOrigem;
      else delete next[setorOrigem];
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      await salvarTiposCompartilhadosSetor({ regras });
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar configuracao.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando configuracoes...</p>;

  return (
    <div className="page max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Tipos Compartilhados entre Setores</h1>
        <p className="page-subtitle">
          Permite que outros setores enxerguem tipos especificos sem alterar a area responsavel da solicitacao.
        </p>
      </div>

      <div className="card space-y-5">
        <label className="form-field max-w-md">
          <span className="form-label">Setor de origem</span>
          <select className="input" value={setorOrigem} onChange={event => setSetorOrigem(event.target.value)}>
            {setores.map(setor => {
              const token = normalizarSetorToken(setor);
              return (
                <option key={setor.id} value={token}>
                  {setor.nome} ({token})
                </option>
              );
            })}
          </select>
        </label>

        <div className="divide-y divide-[var(--c-border)] rounded-2xl border border-[var(--c-border)] overflow-hidden">
          {tiposOrdenados.map(tipo => {
            const selecionados = new Set(Array.isArray(regraAtual?.[String(tipo.id)]) ? regraAtual[String(tipo.id)] : []);

            return (
              <section key={tipo.id} className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 bg-[var(--c-card)] p-4">
                <div>
                  <h2 className="font-semibold text-[var(--c-text)]">{tipo.nome}</h2>
                  <p className="text-xs text-[var(--c-muted)]">Marque os setores adicionais que poderao visualizar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {setores
                    .filter(setor => normalizarSetorToken(setor) !== setorOrigem)
                    .map(setor => {
                      const token = normalizarSetorToken(setor);
                      return (
                        <label key={`${tipo.id}-${setor.id}`} className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selecionados.has(token)}
                            onChange={() => alternar(tipo.id, token)}
                          />
                          <span>{setor.nome} ({token})</span>
                        </label>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </div>
    </div>
  );
}
