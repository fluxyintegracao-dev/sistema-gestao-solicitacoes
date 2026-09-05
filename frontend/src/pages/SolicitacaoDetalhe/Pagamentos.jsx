import { useEffect, useMemo, useState } from 'react';
import {
  baixarTituloFinanceiro,
  getContasBancarias,
  getTitulosFinanceirosPorSolicitacao
} from '../../services/financeiro';
import OverlayModal from '../../components/ui/OverlayModal';
import {
  Avisos,
  BlocoConteudo,
  CampoForm,
  FormSecao,
  StatGrid,
  StatTile,
  TabelaPadrao,
  useAvisos,
  useConfirmacao
} from '../../components/padrao';

/**
 * PAGAMENTOS da solicitacao — resumo, titulos vinculados e a baixa parcial por titulo.
 *
 * ## O que a migracao de 05/09 acertou, alem da forma
 *
 * 1. **Nove caixas do navegador viraram componentes do sistema** (R19): oito `alert()` de
 *    validacao e de resultado, e um `window.confirm()` que guardava a BAIXA — a acao que move
 *    dinheiro nesta tela. A confirmacao agora e `useConfirmacao`, com o retorno DESESTRUTURADO
 *    (`const { ok } = await confirmar(...)`, R21: o objeto e sempre truthy, e `const ok =` faria o
 *    "Cancelar" REGISTRAR A BAIXA) e o alvo FIXADO numa `const` antes do `await` (R26).
 * 2. **A mensagem da confirmacao parou de contar so quantos.** Ela dizia "Confirmar baixa de N
 *    titulo(s) desta solicitacao?" — um numero sem valor, sem conta e sem data. Agora nomeia o
 *    TOTAL em dinheiro, a conta bancaria, a data e a forma, que e o que a pessoa precisa conferir
 *    antes de autorizar, e avisa que a baixa e aplicada titulo a titulo (se parar no meio, o que
 *    ja foi baixado fica baixado).
 * 3. **Os rotulos do resumo passaram a dizer a verdade.** Ver o bloco `resumoTitulos` abaixo.
 *
 * ## Sobre a lista de titulos vinculados
 *
 * Ela mostrava `titulos.slice(0, 4)` sem dizer que estava cortando, embaixo de um resumo que soma
 * TODOS. Numa solicitacao com oito titulos, "Valor total R$ 80.000" ficava sobre quatro cartoes
 * somando R$ 40.000 — dois numeros verdadeiros contando historias diferentes. Virou
 * `TabelaPadrao` com o conjunto inteiro, que rola dentro do proprio contorno.
 */

function formatarMoeda(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '-';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(valor) {
  if (!valor) return '-';
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString('pt-BR');
}

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function numeroSeguro(valor) {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tituloBaixavel(titulo) {
  const status = String(titulo?.status || '').toUpperCase();
  return ['ABERTO', 'PARCIAL'].includes(status) && numeroSeguro(titulo?.valor_saldo) > 0;
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function limparDescricaoTituloCompra(value) {
  const texto = String(value || '').trim();
  if (!texto) return texto;
  if (!normalizeSearchText(texto).includes('solicitacao de compra')) return texto;
  return texto
    .replace(/\s+(Itens|Items):[\s\S]*$/i, '')
    .replace(/\s+-\s*$/g, '')
    .trim() || 'Solicitacao de compra';
}

export default function Pagamentos({ solicitacao, podeInformarPagamento = false, onSucesso }) {
  const [modalPagamentosAberto, setModalPagamentosAberto] = useState(false);
  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
  const [titulos, setTitulos] = useState([]);
  const [contas, setContas] = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [formaRecebimento, setFormaRecebimento] = useState('PIX');
  const [dataPagamento, setDataPagamento] = useState(dataHoje());
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTitulos, setLoadingTitulos] = useState(false);
  // A falha de carregamento dos titulos NAO e mais engolida num `console.error`. Ela muda o que a
  // tela mostra: sem titulos, o resumo cai para os campos da solicitacao (ver `temResumoTitulos`)
  // e a pessoa le "Valor total" de outra fonte sem nenhum sinal de que a fonte trocou.
  const [erroTitulos, setErroTitulos] = useState('');
  // Erro de CAMPO: mora ao lado do campo, nao numa faixa que some com um clique deixando o
  // formulario do mesmo jeito (a fronteira que o `Avisos.jsx` declara).
  const [errosBaixa, setErrosBaixa] = useState({});
  const { avisos, avisar, fechar, limpar } = useAvisos();
  const { confirmar, elementoConfirmacao } = useConfirmacao();

  async function carregarTitulos() {
    if (!solicitacao?.id) return;
    try {
      setLoadingTitulos(true);
      setErroTitulos('');
      const data = await getTitulosFinanceirosPorSolicitacao(solicitacao.id);
      setTitulos(Array.isArray(data) ? data : []);
    } catch (error) {
      setTitulos([]);
      setErroTitulos(error?.message || 'Nao foi possivel carregar os titulos financeiros desta solicitacao.');
    } finally {
      setLoadingTitulos(false);
    }
  }

  useEffect(() => {
    carregarTitulos();
  }, [solicitacao?.id]);

  const pagamentos = useMemo(() => (
    (Array.isArray(solicitacao?.pagamentos) ? solicitacao.pagamentos : [])
      .slice()
      .sort((a, b) => {
        const dataA = new Date(a?.data_pagamento || a?.createdAt || 0).getTime();
        const dataB = new Date(b?.data_pagamento || b?.createdAt || 0).getTime();
        return dataB - dataA;
      })
  ), [solicitacao?.pagamentos]);

  const resumoTitulos = useMemo(() => {
    const base = Array.isArray(titulos) ? titulos : [];
    return {
      valor: base.reduce((acc, titulo) => acc + numeroSeguro(titulo.valor_original), 0),
      pago: base.reduce((acc, titulo) => acc + numeroSeguro(titulo.valor_baixado), 0),
      saldo: base.reduce((acc, titulo) => acc + numeroSeguro(titulo.valor_saldo), 0)
    };
  }, [titulos]);

  /*
    QUAL CONJUNTO O RESUMO ESTA SOMANDO — e por que o rotulo tem de dizer.

    A rota `getTitulosFinanceirosPorSolicitacao` devolve TODOS os titulos da solicitacao, sem
    paginacao: a soma cobre o conjunto inteiro, nao uma pagina. Ate aqui, tudo certo.

    O que estava errado era outra coisa, e mais silenciosa: quando NAO ha titulo (ou quando a rota
    falha, o que antes so ia para o `console`), o mesmo rotulo "Valor total / Pago / Saldo" passa a
    mostrar os campos da SOLICITACAO — `valor_total`, `valor_pago_acumulado`, `saldo_pagamento`.
    Sao dois conjuntos diferentes com o mesmo nome, e nada na tela dizia qual estava a vista. Agora
    o rotulo carrega a origem ("N titulos" x "campos da solicitacao"), e a falha de carregamento
    aparece como condicao na tela.
  */
  const temResumoTitulos = resumoTitulos.valor > 0 || resumoTitulos.pago > 0 || resumoTitulos.saldo > 0;
  const valorTotal = temResumoTitulos ? resumoTitulos.valor : Number(solicitacao?.valor_total ?? solicitacao?.valor ?? 0);
  const valorPago = temResumoTitulos ? resumoTitulos.pago : Number(solicitacao?.valor_pago_acumulado || 0);
  const saldoPagamento = temResumoTitulos
    ? resumoTitulos.saldo
    : Number(
        solicitacao?.saldo_pagamento ??
        (Number.isFinite(valorTotal) ? Math.max(valorTotal - valorPago, 0) : 0)
      );
  const origemDoResumo = temResumoTitulos
    ? `soma dos ${titulos.length} titulo(s) vinculado(s)`
    : 'campos da propria solicitacao (nenhum titulo financeiro vinculado)';

  const exibirCard =
    podeInformarPagamento ||
    pagamentos.length > 0 ||
    titulos.length > 0 ||
    (Number.isFinite(valorPago) && valorPago > 0);
  const titulosBaixaveis = titulos.filter(tituloBaixavel);
  const tipoTituloBaixa = String(titulosBaixaveis[0]?.tipo || '').toUpperCase();
  const formaBaixaLabel = tipoTituloBaixa === 'RECEBER' ? 'Forma de recebimento' : 'Forma de pagamento';

  if (!exibirCard) return null;

  async function abrirModalBaixa() {
    try {
      setLoading(true);
      limpar();
      const [titulosData, contasData] = await Promise.all([
        getTitulosFinanceirosPorSolicitacao(solicitacao.id),
        getContasBancarias()
      ]);
      const titulosNormalizados = Array.isArray(titulosData) ? titulosData : [];
      const contasNormalizadas = Array.isArray(contasData) ? contasData : [];
      setTitulos(titulosNormalizados);
      setErroTitulos('');
      setContas(contasNormalizadas);
      setContaBancariaId((atual) => atual || String(contasNormalizadas[0]?.id || ''));
      setSelecionados({});
      setErrosBaixa({});
      setModalBaixaAberto(true);
    } catch (error) {
      avisar.erro(error?.message || 'Erro ao carregar titulos da solicitacao.');
    } finally {
      setLoading(false);
    }
  }

  function toggleTitulo(titulo) {
    setSelecionados((current) => {
      const id = String(titulo.id);
      if (current[id]?.selecionado) {
        return { ...current, [id]: { ...current[id], selecionado: false } };
      }
      return {
        ...current,
        [id]: {
          selecionado: true,
          valor: current[id]?.valor || String(numeroSeguro(titulo.valor_saldo).toFixed(2))
        }
      };
    });
  }

  function alterarValorTitulo(tituloId, valor) {
    setErrosBaixa((atual) => ({ ...atual, [`titulo-${tituloId}`]: '' }));
    setSelecionados((current) => ({
      ...current,
      [String(tituloId)]: {
        ...current[String(tituloId)],
        selecionado: true,
        valor
      }
    }));
  }

  async function salvarBaixasTitulos() {
    // R26: TUDO o que a confirmacao vai citar e o que a acao vai usar fica fixado ANTES do
    // `await`. O modal do sistema nao congela a pagina: sem isto, a pessoa autoriza a baixa de um
    // conjunto e o clique aplica sobre outro — consentimento valido na trilha para uma acao que
    // ninguem autorizou.
    const conta = contas.find((item) => String(item.id) === String(contaBancariaId));
    const forma = formaRecebimento;
    const data = dataPagamento;
    const nota = observacao;
    const solicitacaoAlvo = solicitacao;

    const erros = {};
    if (!conta) erros.conta = 'Selecione a conta bancaria usada no pagamento.';
    if (!forma) erros.forma = `Selecione a ${formaBaixaLabel.toLowerCase()} usada na baixa.`;
    if (!data) erros.data = 'Informe a data do pagamento.';

    const baixas = titulosBaixaveis
      .map((titulo) => ({
        titulo,
        valor: Number(selecionados[String(titulo.id)]?.valor || 0),
        selecionado: Boolean(selecionados[String(titulo.id)]?.selecionado)
      }))
      .filter((item) => item.selecionado);

    if (!baixas.length) erros.selecao = 'Selecione ao menos um titulo para baixar.';
    baixas.forEach((item) => {
      const invalida = !Number.isFinite(item.valor)
        || item.valor <= 0
        || item.valor > numeroSeguro(item.titulo.valor_saldo);
      if (invalida) {
        erros[`titulo-${item.titulo.id}`] = `Informe um valor entre R$ 0,01 e ${formatarMoeda(item.titulo.valor_saldo)}.`;
      }
    });

    if (Object.keys(erros).length) {
      setErrosBaixa(erros);
      return;
    }
    setErrosBaixa({});

    // A mensagem cita o conjunto que a acao percorre (`baixas`), o dinheiro que ele soma, e para
    // onde o dinheiro vai. "Confirmar baixa de 3 titulo(s)?" nao permite conferir nada.
    const totalBaixa = baixas.reduce((acc, item) => acc + item.valor, 0);
    const nomeConta = conta.nome || conta.banco || `Conta #${conta.id}`;
    const { ok } = await confirmar({
      titulo: `Registrar baixa de ${baixas.length} titulo(s)`,
      mensagem: `Baixar ${baixas.length} titulo(s) da solicitacao #${solicitacaoAlvo.id}, somando ${formatarMoeda(totalBaixa)}, em ${nomeConta}, com data ${formatarData(data)} e ${formaBaixaLabel.toLowerCase()} ${forma}. A baixa e aplicada titulo a titulo: se falhar no meio, o que ja foi baixado FICA baixado e nao e desfeito automaticamente.`,
      rotuloConfirmar: 'Registrar baixa'
    });
    if (!ok) return;

    try {
      setLoading(true);
      limpar();
      for (const item of baixas) {
        await baixarTituloFinanceiro(item.titulo.id, {
          valor: item.valor,
          data_movimento: data,
          conta_bancaria_id: conta.id,
          empresa_id: conta.empresa_id || conta.empresa?.id,
          forma_recebimento: forma,
          observacoes: nota || `Pagamento parcial informado pela solicitacao #${solicitacaoAlvo.id}`
        });
      }
      setSelecionados({});
      setObservacao('');
      setDataPagamento(dataHoje());
      setModalBaixaAberto(false);
      await carregarTitulos();
      await onSucesso?.();
      avisar.sucesso(`Baixa de ${formatarMoeda(totalBaixa)} registrada em ${baixas.length} titulo(s).`);
    } catch (error) {
      avisar.erro(error?.message || 'Erro ao registrar baixa financeira');
    } finally {
      setLoading(false);
    }
  }

  return (
    <BlocoConteudo
      titulo="Pagamentos"
      contagem={`${formatarMoeda(valorTotal)} · pago ${formatarMoeda(valorPago)} · saldo ${formatarMoeda(saldoPagamento)}`}
      descricao={`Valores calculados a partir da ${origemDoResumo}.`}
      acoes={(
        <span className="flex flex-wrap items-center gap-2">
          {pagamentos.length > 0 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalPagamentosAberto(true)}>
              Ver pagamentos ({pagamentos.length})
            </button>
          )}
          {podeInformarPagamento && (
            <button type="button" className="btn btn-primary btn-sm" onClick={abrirModalBaixa} disabled={loading}>
              {loading ? 'Carregando...' : 'Informar pagamento parcial'}
            </button>
          )}
        </span>
      )}
    >
      <div className="space-y-4">
        <Avisos avisos={avisos} aoFechar={fechar} />

        {/* CONDICAO, nao evento: fecha e o problema continua (os titulos seguem sem carregar, e o
            resumo continua vindo de outra fonte). Por isso faixa fixa, e nao `useAvisos`. */}
        {erroTitulos && (
          <div className="app-alert app-alert--warning" data-testid="pagamentos-erro-titulos">
            {erroTitulos} O resumo acima esta sendo calculado pelos campos da propria solicitacao.
          </div>
        )}
        {loadingTitulos && <p className="text-xs text-[var(--c-muted)]">Atualizando titulos financeiros...</p>}

        <StatGrid colunas={3}>
          <StatTile label="Valor total" valor={formatarMoeda(valorTotal)} sub={origemDoResumo} />
          <StatTile label="Pago" valor={formatarMoeda(valorPago)} />
          <StatTile label="Saldo" valor={formatarMoeda(saldoPagamento)} />
        </StatGrid>

        {titulos.length > 0 && (
          <TabelaPadrao
            colunas={[
              {
                id: 'titulo',
                titulo: 'Titulo',
                tipo: 'identidade',
                noCard: 'titulo',
                render: (titulo) => `#${titulo.id} ${limparDescricaoTituloCompra(titulo.descricao) || 'Titulo financeiro'}`
              },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (titulo) => titulo.status },
              { id: 'original', titulo: 'Original', tipo: 'valor', render: (titulo) => formatarMoeda(titulo.valor_original) },
              { id: 'baixado', titulo: 'Baixado', tipo: 'valor', render: (titulo) => formatarMoeda(titulo.valor_baixado) },
              { id: 'saldo', titulo: 'Saldo', tipo: 'valor', render: (titulo) => formatarMoeda(titulo.valor_saldo) }
            ]}
            itens={titulos}
            vazio="Nenhum titulo financeiro vinculado a esta solicitacao."
            storageKey="tabela:solicitacao-detalhe-titulos-vinculados"
            rotuloRolagem="Titulos vinculados"
            larguraAcoes={0}
          />
        )}

        {pagamentos.length === 0 ? (
          <p className="text-sm text-[var(--c-muted)]">Nenhum pagamento avulso informado. Use a baixa de titulos para registrar pagamentos parciais.</p>
        ) : (
          <div className="space-y-2">
            {pagamentos.slice(0, 2).map((pagamento) => (
              <div key={pagamento.id} className="rounded-xl border border-[var(--c-border)] px-3 py-3">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <strong>{formatarMoeda(pagamento.valor)}</strong>
                  <span className="text-sm text-[var(--c-muted)]">{formatarData(pagamento.data_pagamento)}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--c-muted)]">
                  Registrado por {pagamento.criadoPor?.nome || 'Usuario'}
                </p>
                {pagamento.observacao && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--c-text)]">{pagamento.observacao}</p>
                )}
              </div>
            ))}
            {/* O rotulo diz o recorte: eram "os 2 mais recentes" apresentados como se fossem a
                lista, e o botao "Ver pagamentos" so aparecia quando havia mais de 2 — quem tinha
                exatamente 2 nunca soube que existia uma lista completa. */}
            {pagamentos.length > 2 && (
              <p className="text-xs text-[var(--c-muted)]">
                Mostrando os 2 pagamentos mais recentes de {pagamentos.length}. Use "Ver pagamentos" para a lista completa.
              </p>
            )}
          </div>
        )}
      </div>

      {/* R9: a baixa INTERROMPE o trabalho de acompanhar a solicitacao — modal do sistema
          (`OverlayModal`), nao mais um `fixed inset-0` proprio com `bg-slate-950/40` (paleta crua,
          R25) e `overflow-hidden` num ancestral de tabela (R18). */}
      {modalBaixaAberto && (
        <OverlayModal
          aberto
          largura="var(--modal-max-w-lg, 860px)"
          rotulo="Baixa parcial por titulo"
          onFechar={() => setModalBaixaAberto(false)}
        >
          <div data-modal="cabecalho" className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--c-text)]">Baixa parcial por titulo</h3>
              <p className="text-sm text-[var(--c-muted)]">
                Selecione um ou mais titulos da solicitacao e informe quanto foi pago em cada um.
              </p>
            </div>
            <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => setModalBaixaAberto(false)}>
              Fechar
            </button>
          </div>

          <div className="px-4 py-4">
            <FormSecao colunas={2}>
              <CampoForm label="Conta bancaria da baixa" obrigatorio span={2} erro={errosBaixa.conta}>
                <select className="input" value={contaBancariaId}
                  onChange={(event) => { setContaBancariaId(event.target.value); setErrosBaixa((a) => ({ ...a, conta: '' })); }}>
                  <option value="">Selecione</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome || conta.banco || `Conta #${conta.id}`}
                      {conta.empresa?.nome ? ` - ${conta.empresa.nome}` : ''}
                    </option>
                  ))}
                </select>
              </CampoForm>
              <CampoForm label="Data do pagamento" obrigatorio erro={errosBaixa.data}>
                <input type="date" className="input" value={dataPagamento}
                  onChange={(event) => { setDataPagamento(event.target.value); setErrosBaixa((a) => ({ ...a, data: '' })); }} />
              </CampoForm>
              {/* Select de FORMULARIO (entrada de dado), nao de filtro — legitimo pela R12. */}
              <CampoForm label={formaBaixaLabel} obrigatorio erro={errosBaixa.forma}>
                <select className="input" value={formaRecebimento}
                  onChange={(event) => { setFormaRecebimento(event.target.value); setErrosBaixa((a) => ({ ...a, forma: '' })); }}>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              </CampoForm>
              <CampoForm label="Observacao" tipo="texto-longo">
                <input className="input" value={observacao} onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Observacao opcional" />
              </CampoForm>
            </FormSecao>

            <div className="mt-4 space-y-2">
              {errosBaixa.selecao && <p className="form-error">{errosBaixa.selecao}</p>}
              {titulosBaixaveis.length === 0 ? (
                <div className="app-empty-card">Nenhum titulo aberto ou parcial vinculado a esta solicitacao.</div>
              ) : titulosBaixaveis.map((titulo) => {
                const estado = selecionados[String(titulo.id)] || {};
                return (
                  <div key={titulo.id} className="rounded-xl border border-[var(--c-border)] p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={Boolean(estado.selecionado)}
                        onChange={() => toggleTitulo(titulo)}
                      />
                      #{titulo.id} {limparDescricaoTituloCompra(titulo.descricao) || 'Titulo financeiro'}
                    </label>
                    <p className="mt-1 text-xs text-[var(--c-muted)]">
                      Vencimento: {formatarData(titulo.data_vencimento)} | Saldo: {formatarMoeda(titulo.valor_saldo)}
                    </p>
                    <FormSecao colunas={2}>
                      <CampoForm label="Valor pago" erro={errosBaixa[`titulo-${titulo.id}`]}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={numeroSeguro(titulo.valor_saldo)}
                          className="input input-moeda"
                          value={estado.valor || ''}
                          onChange={(event) => alterarValorTitulo(titulo.id, event.target.value)}
                          placeholder="0,00"
                        />
                      </CampoForm>
                    </FormSecao>
                  </div>
                );
              })}
            </div>
          </div>

          <div data-modal="rodape" className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
            <button type="button" className="btn btn-outline" onClick={() => setModalBaixaAberto(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={salvarBaixasTitulos} disabled={loading || !formaRecebimento}>
              {loading ? 'Salvando...' : 'Registrar baixa'}
            </button>
          </div>
        </OverlayModal>
      )}

      {modalPagamentosAberto && (
        <OverlayModal
          aberto
          largura="var(--modal-max-w-xl, 1040px)"
          rotulo="Pagamentos registrados"
          onFechar={() => setModalPagamentosAberto(false)}
        >
          <div data-modal="cabecalho" className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--c-text)]">Pagamentos registrados</h3>
              <p className="text-sm text-[var(--c-muted)]">
                {pagamentos.length} pagamento(s), listados por data, valor e usuario responsavel pelo registro.
              </p>
            </div>
            <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => setModalPagamentosAberto(false)}>
              Fechar
            </button>
          </div>

          <div className="px-4 py-4">
            <TabelaPadrao
              colunas={[
                {
                  id: 'data',
                  titulo: 'Data',
                  tipo: 'data',
                  noCard: 'titulo',
                  render: (pagamento) => formatarData(pagamento.data_pagamento)
                },
                {
                  id: 'valor',
                  titulo: 'Valor',
                  tipo: 'valor',
                  render: (pagamento) => <span className="font-semibold">{formatarMoeda(pagamento.valor)}</span>
                },
                {
                  id: 'registrado_por',
                  titulo: 'Registrado por',
                  tipo: 'texto',
                  render: (pagamento) => pagamento.criadoPor?.nome || 'Usuario'
                },
                {
                  id: 'observacao',
                  titulo: 'Observacao',
                  tipo: 'texto',
                  render: (pagamento) => (
                    <span className="whitespace-pre-wrap">{pagamento.observacao || '-'}</span>
                  )
                }
              ]}
              itens={pagamentos}
              vazio="Nenhum pagamento registrado."
              storageKey="tabela:solicitacao-detalhe-pagamentos"
              rotuloRolagem="Pagamentos registrados"
              // R17: o pagamento e uma serie temporal (data + valor lancados
              // no caixa) — nenhuma coluna NOMEIA o registro: "Registrado
              // por" nomeia o usuario, nao o pagamento.
              semIdentidade
            />
          </div>
        </OverlayModal>
      )}
      {elementoConfirmacao}
    </BlocoConteudo>
  );
}
