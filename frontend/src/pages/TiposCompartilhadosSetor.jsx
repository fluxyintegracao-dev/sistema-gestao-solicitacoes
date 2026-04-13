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
        setSetores(setoresAtivos);
        setTipos(Array.isArray(tiposData) ? tiposData : []);
        setRegras(
          configuracao?.regras && typeof configuracao.regras === 'object'
            ? configuracao.regras
            : {}
        );
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar configuracoes de tipos compartilhados.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
    );
  }, [setores]);

  const tiposOrdenados = useMemo(() => {
    return [...tipos].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
    );
  }, [tipos]);

  function toggleSetor(tipoId, setorToken) {
    const chaveTipo = String(tipoId);
    const token = String(setorToken || '').trim().toUpperCase();

    setRegras((prev) => {
      const listaAtual = Array.isArray(prev?.[chaveTipo]) ? prev[chaveTipo] : [];
      const set = new Set(listaAtual);

      if (set.has(token)) {
        set.delete(token);
      } else {
        set.add(token);
      }

      const proximaLista = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const proximoEstado = { ...prev };

      if (proximaLista.length === 0) {
        delete proximoEstado[chaveTipo];
      } else {
        proximoEstado[chaveTipo] = proximaLista;
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
          Defina quais setores extras passam a visualizar uma solicitacao desde a criacao, sem assumir a posse do fluxo.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="text-sm text-gray-600">
          O setor responsavel continua sendo um so. Os setores marcados abaixo ganham apenas visibilidade adicional para o tipo de solicitacao selecionado.
        </div>

        <div className="border rounded-lg divide-y">
          {tiposOrdenados.map((tipo) => {
            const setoresSelecionados = new Set(
              Array.isArray(regras?.[String(tipo.id)]) ? regras[String(tipo.id)] : []
            );

            return (
              <div
                key={tipo.id}
                className="p-4 grid grid-cols-1 lg:grid-cols-[minmax(220px,280px)_1fr] gap-4"
              >
                <div>
                  <h2 className="font-medium">{tipo.nome}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Se nenhum setor for marcado, esse tipo segue sem compartilhamento extra.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {setoresOrdenados.map((setor) => {
                    const token = normalizarSetorToken(setor);
                    return (
                      <label
                        key={`${tipo.id}-${setor.id}`}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={setoresSelecionados.has(token)}
                          onChange={() => toggleSetor(tipo.id, token)}
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
