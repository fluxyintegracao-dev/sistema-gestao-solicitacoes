import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { corrigirTextoCorrompido } from '../../utils/texto';
import { formatarDataLocalPtBr } from '../../utils/dateLocal';

function formatarData(valor) {
  return formatarDataLocalPtBr(valor);
}

function formatarDataHora(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleString('pt-BR');
}

function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extrairMensagemErro(error) {
  if (!error?.message) return 'Erro ao atualizar ref. do contrato';
  try {
    const parsed = JSON.parse(error.message);
    return parsed?.error || error.message;
  } catch {
    return error.message;
  }
}

function InfoItem({ label, value }) {
  return (
    <div className="sol-detail-stat">
      <span className="sol-detail-stat-label">{label}</span>
      <p className="sol-detail-stat-value">{value || '-'}</p>
    </div>
  );
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isDiretoriaObras(valor) {
  const texto = normalizarTexto(valor)
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return texto.includes('OBRAS_PUBLIC') || texto.includes('OBRAS_PRIVAD');
}

export default function Header({
  solicitacao,
  onAlterarStatus,
  onEnviarSetor,
  mostrarAlterarStatus = true,
  mostrarEnviarSetor = true,
  textoEnviarSetor = 'Enviar para outro setor',
  podeEditarRefContrato = false,
  contratosObra = [],
  onSalvarRefContrato
}) {
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState('');
  const [salvandoRef, setSalvandoRef] = useState(false);

  useEffect(() => {
    setContratoSelecionadoId(solicitacao?.contrato_id ? String(solicitacao.contrato_id) : '');
  }, [solicitacao?.contrato_id]);

  const opcoesContrato = useMemo(() => {
    if (!Array.isArray(contratosObra)) return [];
    return contratosObra.map(contrato => ({
      id: String(contrato.id),
      label: `${contrato.ref_contrato || '-'} (${contrato.codigo || '-'})`
    }));
  }, [contratosObra]);

  const refContratoAtual = solicitacao?.contrato?.ref_contrato || '-';
  const codigoContratoAtual = solicitacao?.codigo_contrato || solicitacao?.contrato?.codigo || '-';
  const houveAlteracaoRef = contratoSelecionadoId && String(contratoSelecionadoId) !== String(solicitacao?.contrato_id || '');

  async function handleSalvarRefContrato() {
    if (!onSalvarRefContrato || !contratoSelecionadoId || !houveAlteracaoRef) return;
    try {
      setSalvandoRef(true);
      await onSalvarRefContrato(Number(contratoSelecionadoId));
    } catch (error) {
      alert(extrairMensagemErro(error));
    } finally {
      setSalvandoRef(false);
    }
  }

  const historicos = Array.isArray(solicitacao?.historicos) ? solicitacao.historicos : [];
  const tipoNomeNormalizado = normalizarTexto(solicitacao?.tipo?.nome);
  const exibirSubtipoAdmLocal = tipoNomeNormalizado === 'ADM LOCAL DE OBRA';
  const subtipoSolicitacao = solicitacao?.tipoSubSolicitacao?.nome || '-';
  const exibirSubtipo = exibirSubtipoAdmLocal || subtipoSolicitacao !== '-';
  const ultimoHistoricoStatus = [...historicos]
    .filter(item => item?.acao === 'STATUS_ALTERADO')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const setorStatusAtual = ultimoHistoricoStatus?.setor || solicitacao?.area_responsavel || null;
  const descricaoCorrigida = corrigirTextoCorrompido(solicitacao?.descricao || '');
  const valorTotal = solicitacao?.valor_total ?? solicitacao?.valor;
  const valorPagoAcumulado = solicitacao?.valor_pago_acumulado ?? 0;
  const saldoPagamento = solicitacao?.saldo_pagamento;
  const prioridadeDiretoriaAtiva = Boolean(solicitacao?.prioridade_diretoria_ativa);
  const mostrarAlterarStatusDiretoria =
    Boolean(solicitacao?.acao_aprovar_diretoria_disponivel) ||
    Boolean(solicitacao?.pode_alterar_status_diretoria) ||
    isDiretoriaObras(solicitacao?.area_responsavel) ||
    isDiretoriaObras(solicitacao?.diretoria_responsavel) ||
    isDiretoriaObras(solicitacao?.diretoria_fluxo_codigo);
  const mostrarBotaoAlterarStatus = mostrarAlterarStatus || mostrarAlterarStatusDiretoria;

  return (
    <div className="sol-detail-header">
      <div className="sol-detail-header-main">
        <div className="sol-detail-title-wrap">
          <span className="sol-detail-code-chip">{solicitacao.codigo || '-'}</span>
          <h1 className="sol-detail-type">{solicitacao.tipo?.nome || '-'}</h1>
          <p className="sol-detail-description">{descricaoCorrigida || 'Sem descricao informada.'}</p>
        </div>

        <div className="sol-detail-actions">
          {mostrarBotaoAlterarStatus && (
            <button onClick={onAlterarStatus} className="btn btn-outline sol-detail-action-btn" type="button">
              Alterar status
            </button>
          )}
          <StatusBadge status={solicitacao.status_global} setor={setorStatusAtual} />
          {mostrarEnviarSetor && (
            <button onClick={onEnviarSetor} className="btn btn-outline sol-detail-action-btn" type="button">
              {textoEnviarSetor}
            </button>
          )}
        </div>
      </div>

      <div className="sol-detail-stats-grid">
        <InfoItem label="Obra" value={solicitacao.obra?.nome || '-'} />
        <InfoItem label="Setor" value={solicitacao.area_responsavel || '-'} />
        <InfoItem label="Valor total" value={formatarValor(valorTotal)} />
        <InfoItem label="Pago acumulado" value={formatarValor(valorPagoAcumulado)} />
        <InfoItem label="Saldo atual" value={formatarValor(saldoPagamento)} />
        <InfoItem label="Criado em" value={formatarDataHora(solicitacao.createdAt)} />
        <InfoItem label="Vencimento" value={formatarData(solicitacao.data_vencimento)} />
        <InfoItem label="Inicio da medicao" value={formatarData(solicitacao.data_inicio_medicao)} />
        <InfoItem label="Fim da medicao" value={formatarData(solicitacao.data_fim_medicao)} />
        <InfoItem label="Status" value={solicitacao.status_global || '-'} />
        <InfoItem
          label="Prioridade Diretoria"
          value={prioridadeDiretoriaAtiva ? `Autorizada${solicitacao?.prioridade_diretoria_lote_id ? ` (Lote #${solicitacao.prioridade_diretoria_lote_id})` : ''}` : '-'}
        />
      </div>

      <div className="sol-detail-stats-grid sol-detail-contract-grid">
        <InfoItem label="Ref. do contrato" value={refContratoAtual} />
        <InfoItem label="Contrato" value={codigoContratoAtual} />
        {exibirSubtipo && (
          <InfoItem label="Subtipo" value={subtipoSolicitacao} />
        )}
      </div>

      {podeEditarRefContrato && (
        <div className="sol-detail-contract-editor">
          <p className="sol-detail-contract-editor-title">Editar ref. do contrato</p>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              className="input"
              value={contratoSelecionadoId}
              onChange={e => setContratoSelecionadoId(e.target.value)}
            >
              <option value="">Selecione um contrato</option>
              {opcoesContrato.map(opcao => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSalvarRefContrato}
              disabled={!houveAlteracaoRef || salvandoRef}
            >
              {salvandoRef ? 'Salvando...' : 'Salvar ref.'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
