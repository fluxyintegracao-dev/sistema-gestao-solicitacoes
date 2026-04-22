import { useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import { getSetores } from '../services/setores';
import { getTiposSolicitacao } from '../services/tiposSolicitacao';
import { getStatusSetor } from '../services/statusSetor';
import {
  getAutomacaoStatusSetor,
  salvarAutomacaoStatusSetor
} from '../services/configuracoesSistema';

function criarLinhaVazia() {
  return {
    chave_local: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    setor_origem: '',
    tipo_solicitacao_id: '',
    status: '',
    setor_destino: ''
  };
}

function formatarStatus(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function normalizarTokenSetor(valor) {
  return String(valor || '').trim().toUpperCase();
}

function setorPossuiToken(setor, token) {
  const alvo = normalizarTokenSetor(token);
  if (!alvo) return false;

  return [
    setor?.id,
    setor?.codigo,
    setor?.nome
  ].some(valor => normalizarTokenSetor(valor) === alvo);
}

export default function AutomacaoStatusSetor() {
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [statusPorSetor, setStatusPorSetor] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [regras, setRegras] = useState([criarLinhaVazia()]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [setoresData, tiposData, statusData, configuracao] = await Promise.all([
          getSetores(),
          getTiposSolicitacao(),
          getStatusSetor(),
          getAutomacaoStatusSetor()
        ]);

        const setoresAtivos = Array.isArray(setoresData)
          ? setoresData.filter((setor) => setor?.ativo !== false)
          : [];
        const listaStatus = Array.isArray(statusData) ? statusData : [];
        const statusUnicos = Array.from(
          new Map(
            listaStatus
              .filter((item) => item?.ativo !== false && String(item?.nome || '').trim())
              .map((item) => [formatarStatus(item.nome), String(item.nome || '').trim()])
          ).entries()
        ).map(([value, label]) => ({ value, label }));

        const regrasConfiguradas = Array.isArray(configuracao?.regras)
          ? configuracao.regras.map((regra) => ({
              chave_local: `${regra.setor_origem || 'GLOBAL'}-${regra.tipo_solicitacao_id}-${regra.status}-${regra.setor_destino}`,
              setor_origem: String(regra.setor_origem || ''),
              tipo_solicitacao_id: String(regra.tipo_solicitacao_id || ''),
              status: String(regra.status || ''),
              setor_destino: String(regra.setor_destino || '')
            }))
          : [];

        setSetores(setoresAtivos);
        setTipos(Array.isArray(tiposData) ? tiposData : []);
        setStatusPorSetor(listaStatus);
        setStatusOptions(statusUnicos.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
        setRegras(regrasConfiguradas.length > 0 ? regrasConfiguradas : [criarLinhaVazia()]);
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar configuracoes de automacao por status.');
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

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) =>
      String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
    );
  }, [setores]);

  function atualizarRegra(chaveLocal, campo, valor) {
    setRegras((prev) => prev.map((regra) => (
      regra.chave_local === chaveLocal
        ? {
            ...regra,
            [campo]: valor,
            ...(campo === 'setor_origem' ? { status: '' } : {})
          }
        : regra
    )));
  }

  function obterStatusOptionsRegra(regra) {
    const setorOrigem = regra?.setor_origem;
    if (!setorOrigem) return statusOptions;

    const setorSelecionado = setores.find(setor => setorPossuiToken(setor, setorOrigem));
    const statusFiltrados = statusPorSetor.filter((item) => {
      if (item?.ativo === false || !String(item?.nome || '').trim()) return false;
      if (!setorSelecionado) {
        return normalizarTokenSetor(item?.setor) === normalizarTokenSetor(setorOrigem);
      }
      return [
        setorSelecionado.id,
        setorSelecionado.codigo,
        setorSelecionado.nome
      ].some(token => normalizarTokenSetor(item?.setor) === normalizarTokenSetor(token));
    });

    const opcoes = Array.from(
      new Map(
        statusFiltrados.map((item) => [
          formatarStatus(item.nome),
          String(item.nome || '').trim()
        ])
      ).entries()
    ).map(([value, label]) => ({ value, label }));

    return opcoes.length > 0
      ? opcoes.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
      : statusOptions;
  }

  function adicionarLinha() {
    setRegras((prev) => [...prev, criarLinhaVazia()]);
  }

  function removerLinha(chaveLocal) {
    setRegras((prev) => {
      const restantes = prev.filter((regra) => regra.chave_local !== chaveLocal);
      return restantes.length > 0 ? restantes : [criarLinhaVazia()];
    });
  }

  async function salvar() {
    const payload = regras
      .map((regra) => ({
        setor_origem: String(regra.setor_origem || '').trim(),
        tipo_solicitacao_id: Number(regra.tipo_solicitacao_id),
        status: String(regra.status || '').trim(),
        setor_destino: String(regra.setor_destino || '').trim()
      }))
      .filter((regra) => regra.setor_origem && regra.tipo_solicitacao_id && regra.status && regra.setor_destino);

    try {
      setSalvando(true);
      await salvarAutomacaoStatusSetor({ regras: payload });
      alert('Configuracao salva.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configuracao de automacao por status.');
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
        <h1 className="text-2xl font-semibold">Automacao de Envio por Status</h1>
        <p className="text-sm text-gray-600 mt-1">
          Defina quando uma solicitacao deve ser enviada automaticamente para outro setor ao atingir um status especifico.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="text-sm text-gray-600">
          As regras abaixo sao avaliadas apos a alteracao manual de status na area de origem configurada. O setor responsavel atual continua executando a mudanca de status; a automacao apenas envia a solicitacao para o novo setor quando a combinacao for atendida.
        </div>

        <div className="space-y-3">
          {regras.map((regra) => (
            <div
              key={regra.chave_local}
              className="grid grid-cols-1 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,1fr)_auto] gap-3 items-end rounded-xl border border-gray-200 p-4"
            >
              <label className="grid gap-1 text-sm">
                Area de origem
                <select
                  className="input"
                  value={regra.setor_origem}
                  onChange={(event) => atualizarRegra(regra.chave_local, 'setor_origem', event.target.value)}
                >
                  <option value="">Selecione</option>
                  {setoresOrdenados.map((setor) => (
                    <option key={setor.id} value={String(setor.codigo || '').trim().toUpperCase()}>
                      {setor.nome} ({String(setor.codigo || '').trim().toUpperCase()})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                Tipo de solicitacao
                <select
                  className="input"
                  value={regra.tipo_solicitacao_id}
                  onChange={(event) => atualizarRegra(regra.chave_local, 'tipo_solicitacao_id', event.target.value)}
                >
                  <option value="">Selecione</option>
                  {tiposOrdenados.map((tipo) => (
                    <option key={tipo.id} value={String(tipo.id)}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                Status que dispara a automacao
                <select
                  className="input"
                  value={regra.status}
                  onChange={(event) => atualizarRegra(regra.chave_local, 'status', event.target.value)}
                >
                  <option value="">Selecione</option>
                  {obterStatusOptionsRegra(regra).map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                Setor destino
                <select
                  className="input"
                  value={regra.setor_destino}
                  onChange={(event) => atualizarRegra(regra.chave_local, 'setor_destino', event.target.value)}
                >
                  <option value="">Selecione</option>
                  {setoresOrdenados.map((setor) => (
                    <option key={setor.id} value={String(setor.codigo || '').trim().toUpperCase()}>
                      {setor.nome} ({String(setor.codigo || '').trim().toUpperCase()})
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-outline inline-flex items-center justify-center gap-2"
                onClick={() => removerLinha(regra.chave_local)}
                title="Remover regra"
              >
                <HiOutlineTrash className="w-4 h-4" />
                <span className="hidden md:inline">Remover</span>
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            className="btn btn-outline inline-flex items-center gap-2"
            onClick={adicionarLinha}
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Adicionar regra</span>
          </button>

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
