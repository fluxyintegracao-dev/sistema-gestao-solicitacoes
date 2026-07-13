import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  obterCotacaoPublica,
  responderCotacaoPublica,
  salvarRascunhoCotacaoPublica,
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

function contarCasasDecimaisSignificativas(valor, limite = 2) {
  const texto = String(valor ?? '').trim();
  const parteDecimal = texto.split(/[,.]/)[1] || '';
  return Math.min(parteDecimal.length, limite);
}

function normalizarDecimalEditavel(valor, limiteDecimais = 2) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const texto = String(valor).trim().replace('.', ',');
  const [inteiroRaw = '', decimalRaw = ''] = texto.split(',');
  const inteiro = inteiroRaw.replace(/\D/g, '');
  const decimal = decimalRaw.replace(/\D/g, '').slice(0, limiteDecimais);
  if (texto.includes(',')) return `${inteiro || '0'},${decimal}`;
  return decimal ? `${inteiro || '0'},${decimal}` : inteiro;
}

function normalizarDecimalDaApi(valor, limiteDecimais = 10) {
  const editavel = normalizarDecimalEditavel(valor, limiteDecimais);
  if (!editavel.includes(',')) return editavel;
  const [inteiro, decimal] = editavel.split(',');
  const decimalSemZerosArtificiais = decimal.replace(/0+$/, '');
  return decimalSemZerosArtificiais ? `${inteiro},${decimalSemZerosArtificiais}` : inteiro;
}

function sanitizarDecimalInput(valor, limiteDecimais = 2) {
  let raw = String(valor || '').replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const partes = raw.split(',');
  const inteiro = partes.shift().replace(/\D/g, '');
  const decimal = partes.join('').replace(/\D/g, '').slice(0, limiteDecimais);
  if (raw.includes(',')) return `${inteiro || '0'},${decimal}`;
  return inteiro;
}

function formatarMoeda(valor, { casasDecimaisMaximas = 2, preservarEscala = false } = {}) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const num = parseFloat(String(valor).replace(',', '.'));
  if (isNaN(num)) return valor;
  const casas = preservarEscala
    ? contarCasasDecimaisSignificativas(valor, casasDecimaisMaximas)
    : casasDecimaisMaximas;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  }).format(num);
}

function CurrencyInput({
  value,
  onChange,
  disabled,
  className,
  casasDecimais = 2,
  preservarEscala = false,
  zeroComoVazio = false
}) {
  const [focused, setFocused] = useState(false);

  function handleChange(e) {
    onChange(sanitizarDecimalInput(e.target.value, casasDecimais));
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={
        focused
          ? (zeroComoVazio && Number(String(value || '0').replace(',', '.')) === 0
              ? ''
              : normalizarDecimalEditavel(value, casasDecimais))
          : formatarMoeda(value, { casasDecimaisMaximas: casasDecimais, preservarEscala })
      }
      disabled={disabled}
      placeholder={focused ? '0,00' : 'R$ 0,00'}
      onFocus={(event) => {
        setFocused(true);
        window.requestAnimationFrame(() => event.target.select());
      }}
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

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CARTAO', label: 'Cartao' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'FATURADO', label: 'Faturado' },
  { value: 'OUTROS', label: 'Outros' }
];

const FORMAS_PAGAMENTO_EXIGEM_PRAZO_DEFAULT = ['BOLETO', 'CARTAO', 'CHEQUE', 'FATURADO', 'OUTROS'];

function obterFormasPagamentoExigemPrazo(configuracoes) {
  return Array.isArray(configuracoes?.condicoes_pagamento_exigem_prazo)
    ? configuracoes.condicoes_pagamento_exigem_prazo
    : FORMAS_PAGAMENTO_EXIGEM_PRAZO_DEFAULT;
}

function formaPagamentoExigePrazo(tipo, configuracoes) {
  return obterFormasPagamentoExigemPrazo(configuracoes).includes(tipo);
}

function criarCondicoesPagamentoVazias() {
  return Object.fromEntries(
    FORMAS_PAGAMENTO.map((opcao) => [opcao.value, { selecionado: false, prazo: '' }])
  );
}

function parseCondicoesPagamento(valor) {
  const condicoes = criarCondicoesPagamentoVazias();
  const texto = String(valor || '').trim();
  if (!texto) return condicoes;

  let encontrouOpcao = false;
  FORMAS_PAGAMENTO.forEach((opcao) => {
    const escapedLabel = opcao.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = texto.match(new RegExp(`${escapedLabel}\\s*[:\\-]\\s*([^;]+)`, 'i'));
    if (match) {
      condicoes[opcao.value] = { selecionado: true, prazo: match[1].trim() };
      encontrouOpcao = true;
    } else {
      const hasLabel = texto
        .split(';')
        .some((parte) => parte.trim().toLowerCase() === opcao.label.toLowerCase());
      if (hasLabel) {
        condicoes[opcao.value] = { selecionado: true, prazo: '' };
        encontrouOpcao = true;
      }
    }
  });

  if (!encontrouOpcao) {
    condicoes.OUTROS = { selecionado: true, prazo: texto };
  }

  return condicoes;
}

function montarCondicaoPagamento(condicoes) {
  return FORMAS_PAGAMENTO
    .filter((opcao) => condicoes?.[opcao.value]?.selecionado)
    .map((opcao) => {
      const prazo = String(condicoes[opcao.value]?.prazo || '').trim();
      return prazo ? `${opcao.label}: ${prazo}` : opcao.label;
    })
    .join('; ');
}

function AttachmentPreview({ item }) {
  if (!item?.arquivo_url) {
    return null;
  }

  const label = item.arquivo_nome_original || 'Abrir anexo';

  if (item.arquivo_is_image) {
    return (
      <a
        href={item.arquivo_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-[96px] shrink-0"
        title={label}
      >
        <img
          src={item.arquivo_url}
          alt={label}
          className="h-[74px] w-[96px] rounded-md border border-slate-200 object-cover bg-slate-50"
        />
        <span className="mt-1 block truncate text-[10px] text-[var(--sol-text-soft)]">
          {label}
        </span>
      </a>
    );
  }

  return (
    <a
      href={item.arquivo_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-[74px] w-[96px] shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 text-center text-[10px] font-medium text-slate-600 hover:bg-slate-100"
      title={label}
    >
      Ver anexo
    </a>
  );
}

export default function CotacaoFornecedorPublica() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [enviandoPlanilha, setEnviandoPlanilha] = useState(false);
  const [valorMinimoPedido, setValorMinimoPedido] = useState('');
  const [descontoTotal, setDescontoTotal] = useState('');
  const [condicoesPagamento, setCondicoesPagamento] = useState(() => criarCondicoesPagamentoVazias());
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacaoResposta, setObservacaoResposta] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      const data = await obterCotacaoPublica(token);
      setDados(data || null);
      setItens(
        Array.isArray(data?.itens)
            ? data.itens.map((item) => ({
                ...item,
                preco: normalizarDecimalDaApi(item.preco, 10),
                status_disponibilidade: item.status_disponibilidade || 'DISPONIVEL',
                data_chegada: item.data_chegada || ''
              }))
          : []
      );
      setValorMinimoPedido(data?.cotacao?.valor_minimo_pedido ?? '');
      setDescontoTotal(data?.cotacao?.desconto_total ?? '');
      setCondicoesPagamento(parseCondicoesPagamento(data?.cotacao?.condicao_pagamento ?? ''));
      setPrazoEntrega(data?.cotacao?.prazo_entrega ?? '');
      setObservacaoResposta(data?.cotacao?.observacao_resposta ?? '');
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
      atual.map((item, i) => {
        if (i !== index) return item;
        const cotacaoReaberta = String(dados?.cotacao?.status || '').toUpperCase() === 'REABERTA';
        const camposQueReativam = ['preco', 'prazo', 'quantidade_minima_item', 'observacao'];
        const deveReativarItem =
          cotacaoReaberta
          && String(item.status_disponibilidade || '').toUpperCase() === 'NAO_TEM'
          && camposQueReativam.includes(campo)
          && String(valor ?? '').trim() !== '';

        return {
          ...item,
          [campo]: valor,
          ...(deveReativarItem ? { status_disponibilidade: 'DISPONIVEL' } : {})
        };
      })
    );
  }

  function atualizarCondicaoPagamento(tipo, campo, valor) {
    setCondicoesPagamento((atual) => ({
      ...atual,
      [tipo]: {
        ...(atual[tipo] || { selecionado: false, prazo: '' }),
        [campo]: valor
      }
    }));
  }

  function validarCabecalhoResposta() {
    const selecionadas = FORMAS_PAGAMENTO.filter((opcao) => condicoesPagamento?.[opcao.value]?.selecionado);
    if (selecionadas.length === 0) {
      alert('Selecione ao menos uma condicao de pagamento antes de enviar a resposta.');
      return false;
    }

    const semPrazo = selecionadas.find((opcao) =>
      formaPagamentoExigePrazo(opcao.value, dados?.configuracoes) && !String(condicoesPagamento?.[opcao.value]?.prazo || '').trim()
    );
    if (semPrazo) {
      alert(`Informe o prazo/condicao para ${semPrazo.label}.`);
      return false;
    }

    if (!String(prazoEntrega || '').trim()) {
      alert('Informe o prazo de entrega do pedido antes de enviar a resposta.');
      return false;
    }

    return true;
  }

  function montarPayloadResposta({ finalizar = false } = {}) {
    const normalizarNumeroResposta = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const raw = String(value).trim();
      const cleaned = raw.replace(/[^\d,.-]/g, '');
      const parsed = Number(cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const itensPayload = itens.map((item) => {
      const statusDisp = item.status_disponibilidade || 'DISPONIVEL';
      const preco = normalizarNumeroResposta(item.preco);
      const quantidadeMinima = normalizarNumeroResposta(item.quantidade_minima_item);
      const deveMarcarIndisponivel =
        finalizar && statusDisp !== 'NAO_TEM' && (preco === null || preco <= 0);
      const statusEfetivo = deveMarcarIndisponivel ? 'NAO_TEM' : statusDisp;

      return {
        item_tipo: item.item_tipo,
        item_referencia_id: item.item_referencia_id,
        status_disponibilidade: statusEfetivo,
        disponivel: statusEfetivo !== 'NAO_TEM',
        preco: statusEfetivo === 'NAO_TEM' ? null : preco,
        prazo: item.prazo,
        data_chegada: statusEfetivo === 'PARA_CHEGAR' ? item.data_chegada : null,
        observacao: item.observacao,
        quantidade_minima_item: statusEfetivo === 'NAO_TEM' ? null : quantidadeMinima
      };
    });

    return {
      itens: itensPayload,
      valor_minimo_pedido: valorMinimoPedido,
      desconto_total: descontoTotal,
      condicao_pagamento: montarCondicaoPagamento(condicoesPagamento),
      prazo_entrega: prazoEntrega,
      observacao_resposta: observacaoResposta
    };
  }

  async function handleSalvarRascunho() {
    try {
      setSalvandoRascunho(true);
      await salvarRascunhoCotacaoPublica(token, montarPayloadResposta({ finalizar: false }));
      await carregar();
      alert('Rascunho salvo com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar rascunho');
    } finally {
      setSalvandoRascunho(false);
    }
  }

  async function handleSalvarOnline() {
    if (!validarCabecalhoResposta()) {
      return;
    }

    try {
      setSalvando(true);
      await responderCotacaoPublica(token, montarPayloadResposta({ finalizar: true }));
      await carregar();
      alert('Resposta enviada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao enviar resposta');
    } finally {
      setSalvando(false);
    }
  }

  async function handleUploadArquivo(file) {
    try {
      if (!file) return;

      setEnviandoPlanilha(true);
      const resposta = await uploadPlanilhaCotacaoPublica(token, file);
      await carregar();
      const tipoArquivoResposta = resposta?.cotacao?.arquivo_resposta_tipo;
      alert(tipoArquivoResposta
        ? 'Arquivo anexado. Para finalizar, confira os dados do cabecalho e clique em Enviar resposta.'
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
  const arquivoRespostaUrl = dados.cotacao?.arquivo_resposta_url || dados.cotacao?.pdf_resposta_url || null;
  const arquivoRespostaTipo = dados.cotacao?.arquivo_resposta_tipo || 'ARQUIVO';
  const arquivoRespostaIsImage = Boolean(dados.cotacao?.arquivo_resposta_is_image);
  const respostaFinalizada = ['RESPONDIDO', 'FINALIZADA'].includes(String(statusCotacao).toUpperCase());
  const cotacaoReaberta = String(statusCotacao).toUpperCase() === 'REABERTA';
  const formularioBloqueado = dados.somente_leitura || respostaFinalizada;
  const itensDisponiveis = itens.filter(
    (item) => (item.status_disponibilidade || 'DISPONIVEL') !== 'NAO_TEM'
  ).length;

  return (
    <div className="cotacao-publica-page solicitacoes-page min-h-screen px-3 py-4">
      <div className="cotacao-publica-shell mx-auto max-w-7xl">

        {/* CabeÃ§alho */}
        <div className="mb-3">
          <h1 className="text-base font-semibold">Resposta de Cotacao</h1>
          <p className="text-xs text-[var(--sol-text-soft)]">
            Preencha os itens online ou envie a resposta em PDF ou imagem.
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
                {itens.length} itens Â· {itensDisponiveis} disponiveis
              </span>
            </div>
          </div>

          {dados.somente_leitura && (
            <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              {['CANCELADA', 'CANCELADO'].includes(String(dados.cotacao?.status || '').toUpperCase())
                ? 'Esta cotacao foi cancelada e esta disponivel apenas para consulta.'
                : 'Esta cotacao ja foi encerrada e esta apenas para consulta.'}
            </div>
          )}

          {arquivoRespostaUrl && (
            <div className="mb-2 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {arquivoRespostaIsImage && (
                <a href={arquivoRespostaUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={arquivoRespostaUrl}
                    alt="Resposta anexada"
                    className="h-12 w-16 rounded border border-blue-200 bg-white object-cover"
                  />
                </a>
              )}
              <span>
                {respostaFinalizada
                  ? `Resposta finalizada com arquivo anexado (${arquivoRespostaTipo}).`
                  : `Arquivo anexado (${arquivoRespostaTipo}). O envio so sera concluido ao clicar em Enviar resposta.`}
              </span>
              <a href={arquivoRespostaUrl} target="_blank" rel="noopener noreferrer"
                className="ml-auto shrink-0 rounded border border-blue-300 px-2 py-0.5 text-[11px] hover:bg-blue-100">
                Ver arquivo
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
                disabled={formularioBloqueado}
                onChange={setValorMinimoPedido}
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)] mb-0.5">Desconto concedido</p>
              <CurrencyInput
                className="input h-7 text-xs px-2 w-full"
                value={descontoTotal}
                disabled={formularioBloqueado}
                onChange={setDescontoTotal}
                zeroComoVazio
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)] mb-0.5">Prazo entrega *</p>
              <input
                className="input h-7 text-xs px-2 w-full"
                type="text"
                value={prazoEntrega}
                disabled={formularioBloqueado}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                placeholder="Ex.: 7 dias"
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)]">Enviado em</p>
              <p className="text-xs font-semibold">{formatarData(dados.cotacao?.enviado_em)}</p>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)]">Condicoes de pagamento aceitas *</p>
                <span className="text-[10px] text-[var(--sol-text-soft)]">O prazo aparece apenas nas formas marcadas como obrigatorias pela configuracao.</span>
              </div>
              <div className="mt-1 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {FORMAS_PAGAMENTO.map((opcao) => {
                  const condicao = condicoesPagamento[opcao.value] || { selecionado: false, prazo: '' };
                  const exigePrazo = formaPagamentoExigePrazo(opcao.value, dados?.configuracoes);
                  return (
                    <div
                      key={opcao.value}
                      className={`rounded-lg border px-2 py-1.5 transition ${
                        condicao.selecionado
                          ? 'border-blue-200 bg-blue-50/80'
                          : 'border-[var(--c-border)] bg-white/70'
                      }`}
                    >
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--c-fg)]">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300"
                          checked={Boolean(condicao.selecionado)}
                          disabled={formularioBloqueado}
                          onChange={(e) => atualizarCondicaoPagamento(opcao.value, 'selecionado', e.target.checked)}
                        />
                        <span>{opcao.label}</span>
                      </label>
                      {condicao.selecionado && exigePrazo && (
                        <input
                          className="input mt-1 h-7 w-full px-2 text-[11px]"
                          type="text"
                          value={condicao.prazo}
                          disabled={formularioBloqueado}
                          onChange={(e) => atualizarCondicaoPagamento(opcao.value, 'prazo', e.target.value)}
                          placeholder="Ex.: a vista, 7 dias, 30/60"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <p className="text-[10px] uppercase tracking-wide text-[var(--sol-text-soft)] mb-0.5">Observacao da cotacao</p>
              <textarea
                className="input min-h-[58px] w-full px-2 py-2 text-xs"
                value={observacaoResposta}
                disabled={formularioBloqueado}
                onChange={(e) => setObservacaoResposta(e.target.value)}
                placeholder="Informe condicoes comerciais, marcas principais, restricoes ou observacoes gerais da proposta."
              />
            </div>
          </div>

          {/* AÃ§Ãµes do card */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className={`btn btn-primary btn-sm text-xs h-7 px-3 cursor-pointer ${(enviandoPlanilha || formularioBloqueado) ? 'pointer-events-none opacity-60' : ''}`}>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                onChange={(event) => {
                  const [file] = Array.from(event.target.files || []);
                  void handleUploadArquivo(file);
                  event.target.value = '';
                }}
              />
              {enviandoPlanilha ? 'Enviando...' : 'Importar arquivo'}
            </label>
            <span className="text-[10px] text-[var(--sol-text-soft)]">PDF ou imagem</span>
            {!dados.somente_leitura && (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm text-xs h-7 px-3 ml-auto"
                  onClick={handleSalvarRascunho}
                  disabled={salvandoRascunho || salvando || respostaFinalizada}
                  title={respostaFinalizada ? 'Cotacao ja respondida.' : undefined}
                >
                  {salvandoRascunho ? 'Salvando...' : 'Salvar rascunho'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm text-xs h-7 px-3"
                  onClick={handleSalvarOnline}
                  disabled={salvando || salvandoRascunho || respostaFinalizada}
                  title={respostaFinalizada ? 'Cotacao ja respondida.' : undefined}
                >
                  {respostaFinalizada ? 'Resposta enviada' : salvando ? 'Enviando...' : 'Enviar resposta'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* InstruÃ§Ã£o resumida */}
        <p className="mt-2 mb-2 text-[11px] text-[var(--sol-text-soft)]">
          O formulario e opcional: voce pode preencher os itens online ou apenas anexar um PDF/imagem da proposta e confirmar em Enviar resposta.
        </p>

        {/* Tabela */}
        <div className="sol-surface-card rounded-lg solicitacoes-table-shell solicitacoes-table-compact cotacao-publica-table-shell">
          <div className="solicitacoes-table-scroll scrollbar-thin" style={{ scrollbarGutter: 'stable both-edges' }}>
            <table className="table-fixed solicitacoes-table cotacao-publica-table" style={{ width: '100%', minWidth: '1180px', fontSize: '11px' }}>
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
                  const bloqueiaPorIndisponivel = isNaoTem && !cotacaoReaberta;

                  return (
                    <tr
                      key={`${item.item_tipo}-${item.item_referencia_id}`}
                      className={`cotacao-publica-table-row${bloqueiaPorIndisponivel ? ' opacity-50' : ''}`}
                    >
                      <td>
                        <div className="cotacao-publica-cell-description">
                          <strong>{item.nome}</strong>
                          {item.especificacao ? (
                            <span className="mt-1 block whitespace-normal text-[10px] font-medium leading-snug text-[var(--sol-text-soft)]">
                              {item.especificacao}
                            </span>
                          ) : null}
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
                          className={`input cotacao-publica-table-input h-6 text-[11px] px-1.5${bloqueiaPorIndisponivel ? ' pointer-events-none' : ''}`}
                          value={bloqueiaPorIndisponivel ? '' : item.preco}
                          disabled={formularioBloqueado || bloqueiaPorIndisponivel}
                          casasDecimais={10}
                          preservarEscala
                          onChange={(val) => atualizarItem(index, 'preco', val)}
                        />
                      </td>
                      <td>
                        <input
                          className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                          value={item.prazo}
                          disabled={formularioBloqueado || bloqueiaPorIndisponivel}
                          onChange={(e) => atualizarItem(index, 'prazo', e.target.value)}
                          placeholder="Ex.: 7 dias"
                        />
                      </td>
                      <td>
                        <input
                          className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                          type="number"
                          lang="pt-BR"
                          min="0"
                          step="1"
                          inputMode="decimal"
                          value={bloqueiaPorIndisponivel ? '' : item.quantidade_minima_item}
                          disabled={formularioBloqueado || bloqueiaPorIndisponivel}
                          onChange={(e) => atualizarItem(index, 'quantidade_minima_item', e.target.value)}
                          placeholder="Opcional"
                        />
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <select
                            className="input cotacao-publica-table-input h-6 text-[11px] px-1.5"
                            value={statusDisp}
                            disabled={formularioBloqueado}
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
                              disabled={formularioBloqueado}
                              onChange={(e) => atualizarItem(index, 'data_chegada', e.target.value)}
                              title="Data prevista de chegada"
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex min-w-0 items-start gap-2">
                          <AttachmentPreview item={item} />
                          <div className="min-w-0 flex-1">
                            {item.link_produto ? (
                              <a
                                href={item.link_produto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-1 block truncate text-[10px] font-medium text-sky-700 hover:underline"
                                title={item.link_produto}
                              >
                                Link do produto
                              </a>
                            ) : null}
                            <textarea
                              className="input cotacao-publica-table-textarea text-xs"
                              value={item.observacao}
                              disabled={formularioBloqueado}
                              onChange={(e) => atualizarItem(index, 'observacao', e.target.value)}
                              placeholder="Marca, condicoes ou restricoes"
                              rows={2}
                            />
                          </div>
                        </div>
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

      </div>
    </div>
  );
}
