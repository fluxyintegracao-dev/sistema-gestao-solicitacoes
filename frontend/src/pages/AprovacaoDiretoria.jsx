import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import {
  getAprovacaoDiretoria,
  salvarAprovacaoDiretoria
} from '../services/configuracoesSistema';

const CLASSIFICACOES = [
  { value: 'PUBLICA', label: 'Obras publicas' },
  { value: 'PRIVADA', label: 'Obras privadas' }
];

export default function AprovacaoDiretoria() {
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [diretoriasPorClassificacao, setDiretoriasPorClassificacao] = useState({
    PUBLICA: '',
    PRIVADA: ''
  });
  const [setoresDestinoPorTipo, setSetoresDestinoPorTipo] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [setoresData, tiposData, configuracao] = await Promise.all([
          getSetores(),
          getTiposSolicitacao(),
          getAprovacaoDiretoria()
        ]);

        const setoresAtivos = Array.isArray(setoresData)
          ? setoresData.filter(item => item?.ativo !== false)
          : [];
        setSetores(setoresAtivos);
        setTipos(Array.isArray(tiposData) ? tiposData : []);
        setDiretoriasPorClassificacao({
          PUBLICA: String(configuracao?.diretorias_por_classificacao?.PUBLICA || ''),
          PRIVADA: String(configuracao?.diretorias_por_classificacao?.PRIVADA || '')
        });
        setSetoresDestinoPorTipo(
          configuracao?.setores_destino_por_tipo && typeof configuracao.setores_destino_por_tipo === 'object'
            ? configuracao.setores_destino_por_tipo
            : {}
        );
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar configuracoes de aprovacao por diretoria.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) => {
      const nomeA = String(a?.nome || '').toUpperCase();
      const nomeB = String(b?.nome || '').toUpperCase();
      return nomeA.localeCompare(nomeB);
    });
  }, [setores]);

  const tiposOrdenados = useMemo(() => {
    return [...tipos].sort((a, b) => {
      const nomeA = String(a?.nome || '').toUpperCase();
      const nomeB = String(b?.nome || '').toUpperCase();
      return nomeA.localeCompare(nomeB);
    });
  }, [tipos]);

  async function salvar() {
    try {
      setSalvando(true);
      await salvarAprovacaoDiretoria({
        diretorias_por_classificacao: diretoriasPorClassificacao,
        setores_destino_por_tipo: setoresDestinoPorTipo
      });
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar configuracao de aprovacao por diretoria.');
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
        <h1 className="text-2xl font-semibold">Aprovacao por Diretoria</h1>
        <p className="text-sm text-gray-600 mt-1">
          Defina qual diretoria recebe a solicitacao pela classificacao da obra. O setor destino apos aprovacao passa a ser a area responsavel selecionada na criacao.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-6">
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Diretoria por classificacao da obra</h2>
            <p className="text-sm text-gray-500 mt-1">
              Essas diretorias recebem primeiro as solicitacoes criadas pela obra, conforme a classificacao PUBLICA ou PRIVADA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASSIFICACOES.map(item => (
              <label key={item.value} className="grid gap-1 text-sm">
                {item.label}
                <select
                  className="input"
                  value={diretoriasPorClassificacao[item.value] || ''}
                  onChange={e => setDiretoriasPorClassificacao(prev => ({
                    ...prev,
                    [item.value]: e.target.value
                  }))}
                >
                  <option value="">Selecione</option>
                  {setoresOrdenados.map(setor => (
                    <option key={setor.id} value={String(setor.codigo || '').toUpperCase()}>
                      {setor.nome} ({String(setor.codigo || '').toUpperCase()})
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Setor destino apos aprovacao (fallback)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Usado apenas para solicitacoes antigas ou registros sem area destino gravada na criacao.
            </p>
          </div>

          <div className="border rounded-lg divide-y">
            {tiposOrdenados.map(tipo => (
              <div
                key={tipo.id}
                className="p-3 grid grid-cols-1 md:grid-cols-[minmax(240px,1fr)_minmax(260px,360px)] gap-3 items-center"
              >
                <div className="text-sm font-medium">{tipo.nome}</div>
                <select
                  className="input"
                  value={String(setoresDestinoPorTipo[String(tipo.id)] || '')}
                  onChange={e => setSetoresDestinoPorTipo(prev => ({
                    ...prev,
                    [String(tipo.id)]: e.target.value
                  }))}
                >
                  <option value="">Nao configurar</option>
                  {setoresOrdenados.map(setor => (
                    <option key={setor.id} value={String(setor.codigo || '').toUpperCase()}>
                      {setor.nome} ({String(setor.codigo || '').toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

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
