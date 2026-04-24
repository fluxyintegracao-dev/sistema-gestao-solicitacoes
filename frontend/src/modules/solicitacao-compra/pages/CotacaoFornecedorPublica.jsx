import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  baixarModeloCotacaoPublicaXlsx,
  obterCotacaoPublica,
  responderCotacaoPublica,
  uploadPlanilhaCotacaoPublica
} from '../../../services/compras';

function formatarData(data) {
  if (!data) return '-';
  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return '-';
  return valor.toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const num = parseFloat(String(valor).replace(',', '.'));
  if (isNaN(num)) return valor;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(num);
}

function CurrencyInput({ value, onChange, disabled, className }) {
  const [focused, setFocused] = useState(false);

  function handleChange(e) {
    let raw = e.target.value.replace(/[^\d.,]/g, '');
    raw = raw.replace(',', '.');
    const parts = raw.split('.');
    if (parts.length > 2) raw = `${parts[0]}.${parts.slice(1).join('')}`;
    onChange(raw);
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={focused ? value : formatarMoeda(value)}
      disabled={disabled}
      placeholder={focused ? '0,00' : 'R$ 0,00'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
    />
  );
}

const OPCOES_DISPONIBILIDADE = [
  { value: 'DISPONIVEL', label: 'Disponivel' },
  { value: 'NAO_TEM', label: 'Nao tem' },
  { value: 'PARA_CHEGAR', label: 'Para chegar' }
];

export default function CotacaoFornecedorPublica() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoPlanilha, setEnviandoPlanilha] = useState(false);
  const [valorMinimoPedido, setValorMinimoPedido] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      const data = await obterCotacaoPublica(token);
      setDados(data || null);
      setItens(
        Array.isArray(data?.itens)
          ? data.itens.map((item) => ({
              ...item,
              status_disponibilidade: item.status_disponibilidade || 'DISPONIVEL',
              data_chegada: item.data_chegada || ''
            }))
          : []
      );
      setValorMinimoPedido(data?.cotacao?.valor_minimo_pedido ?? '');
      setCondicaoPagamento(data?.cotacao?.condicao_pagamento ?? '');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar cotacao');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [token]);

  function atualizarItem(index, campo, valor) {
    setItens((atual) =>
      atual.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  }

  async function handleSalvarOnline() {
    try {
      setSalvando(true);
      await responderCotacaoPublica(token, {
        itens: itens.map((item) => ({
          item_tipo: item.item_tipo,
          item_referencia_id: item.item_referencia_id,
          status_disponibilidade: item.status_disponibilidade || 'DISPONIVEL',
          disponivel: (item.status_disponibilidade || 'DISPONIVEL') !== 'NAO_TEM',
          preco: item.preco,
          prazo: item.prazo,
          data_chegada: item.status_disponibilidade === 'PARA_CHEGAR' ? item.data_chegada : null,
          observacao: item.observacao,
          quantidade_minima_item: item.quantidade_minima_item
        })),
        valor_minimo_pedido: valorMinimoPedido,
        condicao_pagamento: condicaoPagamento
      });
      await carregar();
      alert('Resposta enviada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao enviar resposta');
    } finally {
      setSalvando(false);
    }
  }

  async function handleBaixarModelo() {
    try {
      const blob = await baixarModeloCotacaoPublicaXlsx(token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotacao-${token}.xlsx`;
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao baixar modelo');
    }
  }

  async function handleUploadArquivo(file) {
    try {
      if (!file) return;
      setEnviandoPlanilha(true);
      await uploadPlanilhaCotacaoPublica(token, file);
      await carregar();
      const isPdf = String(file.name || '').toLowerCase().endsWith('.pdf');
      alert(isPdf
        ? 'PDF recebido. Nossa equipe ira revisar e inserir os precos manualmente.'
        : 'Planilha importada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao importar arquivo');
    } finally {
      setEnviandoPlanilha(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card py-6 text-center text-xs text-[var(--c-muted)]">Carregando cotacao...</div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="page">
        <div className="card py-6 text-center text-xs text-[var(--c-muted)]">Cotacao nao encontrada.</div>
      </div>
    );
  }

  const statusCotacao = dados.cotacao?.status || 'EM ABERTO';
  const pdfRespostaUrl = dados.cotacao?.pdf_resposta_url || null;
  const itensDisponiveis = itens.filter(
    (item) => (item.status_disponibilidade || 'DISPONIVEL') !== 'NAO_TEM'
  ).length;

  return (
    <div className="cotacao-publica-page solicitacoes-page min-h-screen px-3 py-4">
      <div className="cotacao-publica-shell mx-auto max-w-7xl">

        {/* Cabeçalho */}
        <div className="mb-3">
          <h1 className="text-base font-semibold">Resposta de Cotacao</h1>
          <p className="text-xs text-[var(--sol-text-soft)]">
            Preencha os itens online ou baixe o modelo Excel para responder por planilha.
          </p>
        </div>

        {/* Card de dados */}
        <div className="sol-surface-card rounded-lg p-3">
          {/* Topo do card */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xs font-semibold text-[var(--c-fg)]">Dados da cotacao</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--c-border)] px-2 py-0.5 text-[11px] font-medium">
                {statusCotacao}
              </span>
              <span className="text-[11px] text-[var(--sol-text-soft)]">
                {itens.length} itens · {itensDisponiveis} disponiveis
              </span>
            </div>
          </div>

          {dados.somente_leitura && (
            <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              Esta cotacao ja foi encerrada e esta apenas para consulta.
            </div>
          )}

          {pdfRespostaUrl && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
              <span>📄 PDF de resposta recebido. Nossa equipe ira revisar e inserir os precos.</span>
              <a href={pdfRespostaUrl} target="_blank" rel="noopener noreferrer"
                className="ml-auto shrink-0 rounded border border-blue-300 px-2 py-0.5 text-[11px] hover:bg-blue-100">
                Ver PDF
              </a>
            </div>
          )}

          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)]">Fornecedor</p>
              <p className="text-xs font-semibold truncate">{dados.fornecedor?.nome || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)]">Obra</p>
              <p className="text-xs font-semibold truncate">{dados.solicitacao?.obra?.nome || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)] mb-0.5">Vlr. minimo pedido</p>
              <CurrencyInput
                className="input h-7 text-xs px-2 w-full"
                value={valorMinimoPedido}
                disabled={dados.somente_leitura}
                onChange={setValorMinimoPedido}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)] mb-0.5">Condicao de pagamento</p>
              <input
                className="input h-7 text-xs px-2 w-full"
                type="text"
                value={condicaoPagamento}
                disabled={dados.somente_leitura}
                onChange={(e) => setCondicaoPagamento(e.target.value)}
                placeholder="Ex.: 30/60 dias, PIX a vista..."
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)]">Enviado em</p>
              <p className="text-xs font-semibold">{formatarData(dados.cotacao?.enviado_em)}</p>
            </div>
          </div>

          {/* Ações do card */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-outline btn-sm text-xs h-7 px-3" onClick={handleBaixarModelo}>
              Baixar modelo Excel
            </button>
            <label className={`btn btn-outline btn-sm text-xs h-7 px-3 cursor-pointer ${enviandoPlanilha ? 'pointer-events-none opacity-60' : ''}`}>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={(event) => {
                  const [file] = Array.from(event.target.files || []);
                  void handleUploadArquivo(file);
                  event.target.value = '';
                }}
              />
              {enviandoPlanilha ? 'Enviando...' : 'Importar planilha ou PDF'}
            </label>
            <span className="text-[10px] text-[var(--sol-text-soft)]">CSV, Excel ou PDF</span>
            {!dados.somente_leitura && (
              <button
                type="button"
                className="btn btn-primary btn-sm text-xs h-7 px-3 ml-auto"
                onClick={handleSalvarOnline}
                disabled={salvando}
              >
                {salvando ? 'Enviando...' : 'Enviar resposta'}
              </button>
            )}
          </div>
        </div>

        {/* Instrução resumida */}
        <p className="mt-2 mb-2 text-[11px] text-[var(--sol-text-soft)]">
          Informe preco, prazo de entrega e disponibilidade para cada item.
        </p>

        {/* Tabela */}
        <div className="sol-surface-card rounded-lg solicitacoes-table-shell solicitacoes-table-compact cotacao-publica-table-shell">
          <div className="solicitacoes-table-scroll scrollbar-thin" style={{ scrollbarGutter: 'stable both-edges' }}>
            <table className="table-fixed solicitacoes-table cotacao-publica-table" style={{ width: '100%', minWidth: '1100px', fontSize: '11px' }}>
              <colgroup>
                <col style={{ width: '220px' }} />
                <col style={{ width: '88px' }} />
                <col style={{ width: '88px' }} />
                <col style={{ width: '112px' }} />
                <col style={{ width: '112px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '152px' }} />
                <col style={{ width: 'auto' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Descricao</th>
                  <th>Qtd./Un.</th>
                  <th>Necessario</th>
                  <th>Preco unit.</th>
                  <th>Prazo entrega</th>
                  <th>Qtd. min.</th>
                  <th>Disponibilidade</th>
                  <th>Observacao</th>
                </tr>
              </thead>

              <tbody>
                {itens.map((item, index) => {
                  const statusDisp = item.status_disponibilidade || 'DISPONIVEL';
                  const isParaChegar = statusDisp === 'PARA_CHEGAR';
                  const isNaoTem = statusDisp === 'NAO_TEM';

                  return (
                    <tr
                      key={`${item.item_tipo}-${item.item_referencia_id}`}
                      className={`cotacao-publica-table-row${isNaoTem ? ' opacity-50' : ''}`}
                    >
                      <td>
                        <div className="cotacao-publica-cell-description">
                          <strong>{item.nome}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="cotacao-publica-cell-muted">
                          {item.quantidade} {item.unidade}
                        </span>
                      </td>
                      <td>
                        <span className="cotacao-publica-cell-muted">{formatarData(item.necessario_para)}</span>
                      </td>
                      <td>
                        <CurrencyInput
                          className={`input cotacao-publica-table-input h-6 text-[11px] px-1.5${isNaoTem ? ' pointer-events-none' : ''}`}
                          value={isNaoTem ? '' : item.preco}
                          disabled={dados.somente_leitura || isNaoTem}
                          onChange={(val) => atualizarItem(index, 'preco', val)}
                        />
                      </td>
                      <td>
                        <input
                          className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                          value={item.prazo}
                          disabled={dados.somente_leitura || isNaoTem}
                          onChange={(e) => atualizarItem(index, 'prazo', e.target.value)}
                          placeholder="Ex.: 7 dias"
                        />
                      </td>
                      <td>
                        <input
                          className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                          type="number"
                          min="0"
                          step="0.001"
                          value={isNaoTem ? '' : item.quantidade_minima_item}
                          disabled={dados.somente_leitura || isNaoTem}
                          onChange={(e) => atualizarItem(index, 'quantidade_minima_item', e.target.value)}
                          placeholder="Opcional"
                        />
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <select
                            className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                            value={statusDisp}
                            disabled={dados.somente_leitura}
                            onChange={(e) => atualizarItem(index, 'status_disponibilidade', e.target.value)}
                          >
                            {OPCOES_DISPONIBILIDADE.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                          {isParaChegar && (
                            <input
                              className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                              type="date"
                              value={item.data_chegada || ''}
                              disabled={dados.somente_leitura}
                              onChange={(e) => atualizarItem(index, 'data_chegada', e.target.value)}
                              title="Data prevista de chegada"
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <textarea
                          className="input cotacao-publica-table-textarea text-xs"
                          value={item.observacao}
                          disabled={dados.somente_leitura}
                          onChange={(e) => atualizarItem(index, 'observacao', e.target.value)}
                          placeholder="Marca, condicoes ou restricoes"
                          rows={2}
                        />
                      </td>
                    </tr>
                  );
                })}

                {itens.length === 0 && (
                  <tr>
                    <td colSpan="8" className="cotacao-publica-table-empty text-xs">
                      Nenhum item disponivel para resposta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botão de envio no rodapé (conveniência) */}
        {!dados.somente_leitura && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-primary btn-sm text-xs h-7 px-4"
              onClick={handleSalvarOnline}
              disabled={salvando}
            >
              {salvando ? 'Enviando...' : 'Enviar resposta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
