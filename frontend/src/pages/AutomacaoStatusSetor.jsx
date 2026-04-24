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
    tipo_solicitacao_id: '',
    status: '',
    setor_destino: ''
  };
}

function normalizarStatus(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

export default function AutomacaoStatusSetor() {
  const [setores, setSetores] = useState([]);
  const [tipos, setTipos] = useState([]);
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

        const statusUnicos = Array.from(
          new Map(
            (Array.isArray(statusData) ? statusData : [])
              .filter(item => item?.ativo !== false && String(item?.nome || '').trim())
              .map(item => [normalizarStatus(item.nome), String(item.nome || '').trim()])
          ).entries()
        ).map(([value, label]) => ({ value, label }));

        const regrasConfiguradas = Array.isArray(configuracao?.regras)
          ? configuracao.regras.map(regra => ({
            chave_local: `${regra.tipo_solicitacao_id}-${regra.status}-${regra.setor_destino}`,
            tipo_solicitacao_id: String(regra.tipo_solicitacao_id || ''),
            status: String(regra.status || ''),
            setor_destino: String(regra.setor_destino || '')
          }))
          : [];

        setSetores(Array.isArray(setoresData) ? setoresData.filter(item => item?.ativo !== false) : []);
        setTipos(Array.isArray(tiposData) ? tiposData : []);
        setStatusOptions(statusUnicos.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
        setRegras(regrasConfiguradas.length ? regrasConfiguradas : [criarLinhaVazia()]);
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar automacao por status.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const tiposOrdenados = useMemo(() => (
    [...tipos].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'))
  ), [tipos]);

  const setoresOrdenados = useMemo(() => (
    [...setores].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'))
  ), [setores]);

  function atualizarRegra(chaveLocal, campo, valor) {
    setRegras(prev => prev.map(regra => (
      regra.chave_local === chaveLocal ? { ...regra, [campo]: valor } : regra
    )));
  }

  function adicionarLinha() {
    setRegras(prev => [...prev, criarLinhaVazia()]);
  }

  function removerLinha(chaveLocal) {
    setRegras(prev => {
      const restantes = prev.filter(regra => regra.chave_local !== chaveLocal);
      return restantes.length ? restantes : [criarLinhaVazia()];
    });
  }

  async function salvar() {
    const payload = regras
      .map(regra => ({
        tipo_solicitacao_id: Number(regra.tipo_solicitacao_id),
        status: String(regra.status || '').trim(),
        setor_destino: String(regra.setor_destino || '').trim()
      }))
      .filter(regra => regra.tipo_solicitacao_id && regra.status && regra.setor_destino);

    try {
      setSalvando(true);
      await salvarAutomacaoStatusSetor({ regras: payload });
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar automacao por status.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p>Carregando configuracoes...</p>;

  return (
    <div className="page max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Automacao de Envio por Status</h1>
        <p className="page-subtitle">
          Envia a solicitacao automaticamente para outro setor quando uma combinacao de tipo e status for atingida.
        </p>
      </div>

      <div className="card space-y-4">
        {regras.map(regra => (
          <div key={regra.chave_local} className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-2xl border border-[var(--c-border)] p-4">
            <label className="form-field">
              <span className="form-label">Tipo de solicitacao</span>
              <select className="input" value={regra.tipo_solicitacao_id} onChange={event => atualizarRegra(regra.chave_local, 'tipo_solicitacao_id', event.target.value)}>
                <option value="">Selecione</option>
                {tiposOrdenados.map(tipo => (
                  <option key={tipo.id} value={String(tipo.id)}>{tipo.nome}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Status gatilho</span>
              <select className="input" value={regra.status} onChange={event => atualizarRegra(regra.chave_local, 'status', event.target.value)}>
                <option value="">Selecione</option>
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Setor destino</span>
              <select className="input" value={regra.setor_destino} onChange={event => atualizarRegra(regra.chave_local, 'setor_destino', event.target.value)}>
                <option value="">Selecione</option>
                {setoresOrdenados.map(setor => {
                  const codigo = String(setor.codigo || '').trim().toUpperCase();
                  return <option key={setor.id} value={codigo}>{setor.nome} ({codigo})</option>;
                })}
              </select>
            </label>

            <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={() => removerLinha(regra.chave_local)}>
              <HiOutlineTrash className="w-4 h-4" />
              Remover
            </button>
          </div>
        ))}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button type="button" className="btn btn-outline inline-flex items-center gap-2" onClick={adicionarLinha}>
            <HiOutlinePlus className="w-4 h-4" />
            Adicionar regra
          </button>
          <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </div>
    </div>
  );
}
