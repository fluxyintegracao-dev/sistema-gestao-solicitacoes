import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import {
  getTiposCompartilhadosEntreSetores,
  salvarTiposCompartilhadosEntreSetores
} from '../services/configuracoesSistema';

function normalizarSetorToken(setor) {
  return String(setor?.codigo || setor?.nome || setor?.id || '')
    .trim()
    .toUpperCase();
}

export default function TiposCompartilhadosSetor() {
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [regras, setRegras] = useState({});
  const [setorOrigemSelecionado, setSetorOrigemSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [setoresData, tiposData, configuracao] = await Promise.all([
          getSetores(),
          getTiposSolicitacao(),
          getTiposCompartilhadosEntreSetores()
        ]);

        const setoresAtivos = Array.isArray(setoresData)
          ? setoresData.filter((setor) => setor?.ativo !== false)
          : [];
        const setoresOrdenados = [...setoresAtivos].sort((a, b) =>
          String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
        );

        setSetores(setoresOrdenados);
        setTipos(Array.isArray(tiposData) ? tiposData : []);
        setRegras(
          configuracao?.regras && typeof configuracao.regras === 'object'
            ? configuracao.regras
            : {}
        );

        if (setoresOrdenados.length > 0) {
          setSetorOrigemSelecionado(normalizarSetorToken(setoresOrdenados[0]));
        }
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar configuracoes de tipos compartilhados.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const tiposOrdenados = useMemo(() => {
    return [...tipos].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
    );
  }, [tipos]);

  const regraAtual = useMemo(() => {
    const regra = regras?.[setorOrigemSelecionado];
    return regra && typeof regra === 'object' ? regra : {};
  }, [regras, setorOrigemSelecionado]);

  function toggleSetorCompartilhado(tipoId, setorToken) {
    const chaveTipo = String(tipoId);
    const token = String(setorToken || '').trim().toUpperCase();

    setRegras((prev) => {
      const regraOrigem = prev?.[setorOrigemSelecionado] && typeof prev[setorOrigemSelecionado] === 'object'
        ? { ...prev[setorOrigemSelecionado] }
        : {};
      const listaAtual = Array.isArray(regraOrigem[chaveTipo]) ? regraOrigem[chaveTipo] : [];
      const set = new Set(listaAtual);

      if (set.has(token)) {
        set.delete(token);
      } else {
        set.add(token);
      }

      const proximaLista = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));

      if (proximaLista.length === 0) {
        delete regraOrigem[chaveTipo];
      } else {
        regraOrigem[chaveTipo] = proximaLista;
      }

      const proximoEstado = { ...prev };
      if (Object.keys(regraOrigem).length === 0) {
        delete proximoEstado[setorOrigemSelecionado];
      } else {
        proximoEstado[setorOrigemSelecionado] = regraOrigem;
      }

      return proximoEstado;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      await salvarTiposCompartilhadosEntreSetores({ regras });
      alert('Configuracao salva.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configuracao de tipos compartilhados.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <p>Carregando configuracoes...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tipos Compartilhados entre Setores</h1>
        <p className="text-sm text-gray-600 mt-1">
          Defina qual setor de origem compartilha determinados tipos de solicitacao com outros setores, sem transferir a posse do fluxo.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] gap-4 items-end">
          <label className="grid gap-1 text-sm">
            Setor que compartilha a solicitacao
            <select
              className="input"
              value={setorOrigemSelecionado}
              onChange={(event) => setSetorOrigemSelecionado(event.target.value)}
            >
              {setores.map((setor) => {
                const token = normalizarSetorToken(setor);
                return (
                  <option key={setor.id} value={token}>
                    {setor.nome} ({token})
                  </option>
                );
              })}
            </select>
          </label>

          <div className="text-sm text-gray-600">
            Exemplo: se o setor de origem for `DEPARTAMENTO_PESSOAL` e o tipo for `ADMISSAO`, voce pode marcar `SESMT` como setor compartilhado. Assim, novas solicitacoes desse tipo criadas para esse setor tambem ficam visiveis ao `SESMT`.
          </div>
        </div>

        <div className="border rounded-lg divide-y">
          {tiposOrdenados.map((tipo) => {
            const setoresSelecionados = new Set(
              Array.isArray(regraAtual?.[String(tipo.id)]) ? regraAtual[String(tipo.id)] : []
            );

            return (
              <div
                key={tipo.id}
                className="p-4 grid grid-cols-1 lg:grid-cols-[minmax(220px,280px)_1fr] gap-4"
              >
                <div>
                  <h2 className="font-medium">{tipo.nome}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Se nenhum setor for marcado, esse tipo segue sem compartilhamento extra para o setor de origem selecionado.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {setores
                    .filter((setor) => normalizarSetorToken(setor) !== setorOrigemSelecionado)
                    .map((setor) => {
                      const token = normalizarSetorToken(setor);
                      return (
                        <label
                          key={`${tipo.id}-${setor.id}`}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={setoresSelecionados.has(token)}
                            onChange={() => toggleSetorCompartilhado(tipo.id, token)}
                          />
                          <span>{setor.nome} ({token})</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </div>
    </div>
  );
}
