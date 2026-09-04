import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlinePlus,
  HiOutlineXMark
} from 'react-icons/hi2';
import {
  abrirCaixaFinanceiro,
  confirmarConciliacaoDiaCaixa,
  estornarMovimentoCaixaFinanceiro,
  fecharCaixaFinanceiro,
  getCaixaFinanceiro,
  getCaixasFinanceiros,
  getContasBancarias,
  registrarMovimentoCaixaFinanceiro
} from '../services/financeiro';
import OverlayModal from '../components/ui/OverlayModal';
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  BarraFiltros,
  alternarValorFiltro,
  StatGrid,
  StatTile,
  TabelaPadrao,
  Avisos,
  useAvisos
} from '../components/padrao';
import { formatCurrencyInput, normalizeCurrencyTyping, parseCurrencyInput } from '../utils/formatters';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString || today()}T12:00:00`);
  if (Number.isNaN(date.getTime())) return today();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
}

function contaEhCaixaFisico(conta) {
  return String(conta?.tipo_operacional || '').toUpperCase() === 'CAIXA_INTERNO';
}

function contaParticipaDoControle(conta) {
  return conta?.ativo !== false && (contaEhCaixaFisico(conta) || conta?.exige_abertura_fechamento === true);
}

function contaLabel(conta) {
  if (!conta) return 'Conta não informada';
  const tipo = contaEhCaixaFisico(conta) ? 'Caixa físico' : (conta.banco || 'Conta financeira');
  return `${conta.nome || `Conta ${conta.id}`} · ${tipo}`;
}

function empresaLabel(conta) {
  return conta?.empresa?.nome || conta?.empresa?.razao_social || 'Empresa não informada';
}

/* R25 — o par claro/escuro do status vinha de dez classes de paleta crua
   (`bg-emerald-50 dark:bg-emerald-950/30`...). O sistema já tem o par
   pronto no `badge-*`, que aponta para os tokens --sem-* e passa pelo piso
   de contraste do ThemeContext (R24). */
function statusClass(status) {
  return String(status || '').toUpperCase() === 'ABERTO'
    ? 'badge badge-success'
    : 'badge badge-muted';
}

export default function FinanceiroCaixas() {
  const [contas, setContas] = useState([]);
  const [contaSelecionadaId, setContaSelecionadaId] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [sessoes, setSessoes] = useState([]);
  const [sessaoDetalhe, setSessaoDetalhe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /*
    R19 — as duas faixas de tom próprio (`.app-alert-error` e
    `.app-alert-success`, DUAS classes que nunca existiram no CSS do
    projeto: o estilo não chegava à tela) viraram a faixa do sistema.
    Tudo o que passava por elas é EVENTO — abriu, registrou, fechou,
    falhou agora — e evento é aviso empilhável e fechável (`useAvisos`),
    com o sucesso sumindo sozinho em 6s.
  */
  const { avisos, avisar, fechar: fecharAviso, limpar: limparAvisos } = useAvisos();
  const carregamentoIdRef = useRef(0);
  const [abrirForm, setAbrirForm] = useState({ data_abertura: today(), saldo_abertura: '', observacoes: '' });
  const [movimentoForm, setMovimentoForm] = useState({ natureza: 'SAIDA', data_movimento: today(), valor: '', descricao: '', documento_referencia: '' });
  const [fecharForm, setFecharForm] = useState({ data_fechamento: today(), saldo_informado: '', observacoes: '' });
  const [estorno, setEstorno] = useState({ movimento: null, motivo: '' });

  useEffect(() => {
    let active = true;
    getContasBancarias()
      .then((data) => {
        if (!active) return;
        const elegiveis = (Array.isArray(data) ? data : [])
          .filter(contaParticipaDoControle)
          .sort((a, b) => Number(contaEhCaixaFisico(b)) - Number(contaEhCaixaFisico(a)) || String(a.nome || '').localeCompare(String(b.nome || '')));
        setContas(elegiveis);
        setContaSelecionadaId((current) => current || String(elegiveis[0]?.id || ''));
      })
      .catch((err) => avisar.erro(err?.message || 'Erro ao carregar as contas configuradas para caixa.'));
    return () => { active = false; };
  }, []);

  const empresas = useMemo(() => {
    const map = new Map();
    contas.forEach((conta) => {
      if (conta.empresa_id && conta.empresa) map.set(String(conta.empresa_id), conta.empresa);
    });
    return [...map.values()].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [contas]);

  const contasFiltradas = useMemo(() => contas.filter((conta) => (
    !empresaFiltro || String(conta.empresa_id || '') === String(empresaFiltro)
  )), [contas, empresaFiltro]);

  const contaSelecionada = useMemo(
    () => contas.find((conta) => String(conta.id) === String(contaSelecionadaId)) || null,
    [contas, contaSelecionadaId]
  );

  useEffect(() => {
    if (!contasFiltradas.some((conta) => String(conta.id) === String(contaSelecionadaId))) {
      setContaSelecionadaId(String(contasFiltradas[0]?.id || ''));
    }
  }, [contasFiltradas, contaSelecionadaId]);

  const carregarControleCaixa = useCallback(async () => {
    if (!contaSelecionadaId) {
      setSessoes([]);
      setSessaoDetalhe(null);
      setLoading(false);
      return null;
    }

    const carregamentoId = carregamentoIdRef.current + 1;
    carregamentoIdRef.current = carregamentoId;
    setLoading(true);

    try {
      const data = await getCaixasFinanceiros({ conta_bancaria_id: contaSelecionadaId, status: 'TODOS', limit: 100 });
      if (carregamentoId !== carregamentoIdRef.current) return null;

      const lista = Array.isArray(data) ? data : [];
      setSessoes(lista);
      const aberta = lista.find((sessao) => sessao.status === 'ABERTO');
      if (!aberta) {
        setSessaoDetalhe(null);
        return null;
      }

      const detalhe = await getCaixaFinanceiro(aberta.id);
      if (carregamentoId !== carregamentoIdRef.current) return null;

      setSessaoDetalhe(detalhe);
      setFecharForm((current) => ({
        ...current,
        data_fechamento: today(),
        saldo_informado: formatCurrencyInput(
          detalhe?.resumo_atual?.saldo_sistema ?? detalhe?.saldo_sistema ?? '',
          { emptyZero: false }
        )
      }));
      return detalhe;
    } finally {
      if (carregamentoId === carregamentoIdRef.current) setLoading(false);
    }
  }, [contaSelecionadaId]);

  const aplicarSessaoAtualizada = useCallback((detalhe) => {
    if (!detalhe?.id) return false;

    setSessaoDetalhe(detalhe.status === 'ABERTO' ? detalhe : null);
    setSessoes((atuais) => {
      const existe = atuais.some((sessao) => Number(sessao.id) === Number(detalhe.id));
      if (!existe) return [detalhe, ...atuais];
      return atuais.map((sessao) => (
        Number(sessao.id) === Number(detalhe.id) ? detalhe : sessao
      ));
    });

    if (detalhe.status === 'ABERTO') {
      setFecharForm((current) => ({
        ...current,
        data_fechamento: today(),
        saldo_informado: formatCurrencyInput(
          detalhe?.resumo_atual?.saldo_sistema ?? detalhe?.saldo_sistema ?? '',
          { emptyZero: false }
        )
      }));
    }

    return true;
  }, []);

  useEffect(() => {
    carregarControleCaixa().catch((err) => {
      if (!contaSelecionadaId) return;
      avisar.erro(err?.message || 'Erro ao carregar o controle do caixa.');
      setSessoes([]);
      setSessaoDetalhe(null);
    });
    return () => { carregamentoIdRef.current += 1; };
  }, [carregarControleCaixa, contaSelecionadaId]);

  const sessaoAberta = useMemo(() => sessoes.find((sessao) => sessao.status === 'ABERTO') || null, [sessoes]);
  const sessoesFechadas = useMemo(() => sessoes.filter((sessao) => sessao.status === 'FECHADO'), [sessoes]);
  const resumo = sessaoDetalhe?.resumo_atual || sessaoAberta?.resumo_atual || {};
  const movimentos = Array.isArray(sessaoDetalhe?.movimentos_detalhados) ? sessaoDetalhe.movimentos_detalhados : [];
  const dataMinimaFechamento = useMemo(() => {
    const datasValidas = [
      today(),
      String(sessaoAberta?.data_abertura || ''),
      ...movimentos.map((movimento) => String(movimento?.data || ''))
    ]
      .filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data))
      .sort();

    return datasValidas[datasValidas.length - 1] || today();
  }, [movimentos, sessaoAberta?.data_abertura]);
  const saldoSistema = Number(resumo.saldo_sistema ?? sessaoAberta?.saldo_sistema ?? 0);
  const saldoInformado = parseCurrencyInput(fecharForm.saldo_informado);
  const diferencaFechamento = Number.isFinite(saldoInformado) ? saldoInformado - saldoSistema : 0;
  const caixaFisico = contaEhCaixaFisico(contaSelecionada);

  useEffect(() => {
    setFecharForm((current) => (
      current.data_fechamento >= dataMinimaFechamento
        ? current
        : { ...current, data_fechamento: dataMinimaFechamento }
    ));
  }, [dataMinimaFechamento]);

  async function executar(acao, mensagemErro) {
    try {
      setSaving(true);
      limparAvisos();
      const resultado = await acao();
      if (!resultado?.estadoAplicado) await carregarControleCaixa();
    } catch (err) {
      avisar.erro(err?.message || mensagemErro);
    } finally {
      setSaving(false);
    }
  }

  async function handleAbrir(event) {
    event.preventDefault();
    await executar(async () => {
      await abrirCaixaFinanceiro({ conta_bancaria_id: contaSelecionadaId, data_abertura: abrirForm.data_abertura, saldo_abertura: abrirForm.saldo_abertura === '' ? undefined : abrirForm.saldo_abertura, observacoes: abrirForm.observacoes });
      avisar.sucesso('Caixa aberto com sucesso.');
      setAbrirForm({ data_abertura: today(), saldo_abertura: '', observacoes: '' });
    }, 'Erro ao abrir o caixa.');
  }

  async function handleConfirmarOfx() {
    await executar(async () => {
      const dataReferencia = addDays(abrirForm.data_abertura, -1);
      await confirmarConciliacaoDiaCaixa({ conta_bancaria_id: contaSelecionadaId, data_referencia: dataReferencia, observacoes: abrirForm.observacoes });
      avisar.sucesso(`Conferência OFX de ${formatDate(dataReferencia)} confirmada.`);
    }, 'Erro ao confirmar a conferência OFX.');
  }

  async function handleMovimento(event) {
    event.preventDefault();
    if (!sessaoAberta) return;
    const valorMovimento = parseCurrencyInput(movimentoForm.valor);
    if (valorMovimento <= 0) {
      // AVISO (alerta), não confirmação: não há ação a segurar — o clique
      // de agora não tem valor válido para registrar.
      avisar.alerta('Informe um valor maior que zero para registrar o movimento.');
      return;
    }
    await executar(async () => {
      const detalhe = await registrarMovimentoCaixaFinanceiro(sessaoAberta.id, {
        ...movimentoForm,
        valor: valorMovimento
      });
      const estadoAplicado = aplicarSessaoAtualizada(detalhe);
      avisar.sucesso(`${movimentoForm.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso.`);
      setMovimentoForm({ natureza: movimentoForm.natureza, data_movimento: today(), valor: '', descricao: '', documento_referencia: '' });
      return { estadoAplicado };
    }, 'Erro ao registrar o movimento.');
  }

  async function handleFechar(event) {
    event.preventDefault();
    if (!sessaoAberta) return;
    if (fecharForm.data_fechamento < dataMinimaFechamento) {
      avisar.alerta(`A data de fechamento nao pode ser anterior a ${formatDate(dataMinimaFechamento)}.`);
      return;
    }
    await executar(async () => {
      await fecharCaixaFinanceiro(sessaoAberta.id, {
        ...fecharForm,
        saldo_informado: parseCurrencyInput(fecharForm.saldo_informado)
      });
      avisar.sucesso('Caixa fechado e conferência registrada com sucesso.');
    }, 'Erro ao fechar o caixa.');
  }

  async function handleEstornar(event) {
    event.preventDefault();
    if (!sessaoAberta || !estorno.movimento) return;
    await executar(async () => {
      const detalhe = await estornarMovimentoCaixaFinanceiro(sessaoAberta.id, estorno.movimento.id, { motivo: estorno.motivo });
      const estadoAplicado = aplicarSessaoAtualizada(detalhe);
      avisar.sucesso('Movimento estornado com trilha de auditoria.');
      setEstorno({ movimento: null, motivo: '' });
      return { estadoAplicado };
    }, 'Erro ao estornar o movimento.');
  }

  /*
    R12/R23 — a EMPRESA era um `select` de escolha única filtrando a lista
    de contas: estado invisível e não combinável. Virou marcação na
    BarraFiltros, com etiqueta removível, e APLICA AO MARCAR — o recorte é
    feito em memória sobre `contas`, zero requisição, muito longe do teto
    de 3 e dos 2s da R23. Nada de rascunho, nada de botão.

    O select de CAIXA/CONTA que ficou é seletor de CONTEXTO — escolhe QUAL
    caixa está sendo operado, e todo lançamento herda a escolha. A R12
    declara esse uso legítimo.
  */
  const filtrosAtivos = useMemo(
    () => ({ empresa: new Set(empresaFiltro ? [String(empresaFiltro)] : []) }),
    [empresaFiltro]
  );

  function alternarFiltro(dimensao, valor, opcoes) {
    const proximo = alternarValorFiltro(filtrosAtivos, dimensao, valor, opcoes);
    setEmpresaFiltro([...(proximo.empresa || [])][0] || '');
  }

  const diferencaRelevante = Math.abs(diferencaFechamento) > 0.009;

  return (
    <Pagina>
      {/* R13/C1/C2/R5 — faixa fixa do sistema: título em 22px, contagem e
          apoio numa linha só, ações à direita. Antes era um <h1> em linha
          solta que rolava para fora com a página. */}
      <PageHeader
        titulo="Caixas e contas"
        contagem={contaSelecionada ? contaLabel(contaSelecionada) : 'Nenhuma conta selecionada'}
        descricao="Abertura, movimentação e conferência do dinheiro físico em um único fluxo operacional."
      />

      <Avisos avisos={avisos} aoFechar={fecharAviso} />

      <BlocoConteudo
        titulo="Caixa em operação"
        variante="secundario"
        descricao="Escolha a empresa para estreitar a lista e o caixa que será operado."
      >
        <BarraFiltros
          filtros={[
            {
              id: 'empresa',
              rotulo: 'Empresa',
              unico: true,
              opcoes: empresas.map((empresa) => ({ valor: String(empresa.id), rotulo: empresa.nome || empresa.razao_social }))
            }
          ]}
          ativos={filtrosAtivos}
          aoAlternar={alternarFiltro}
          aoLimpar={() => setEmpresaFiltro('')}
        />

        <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-end">
          <label className="sol-filter-field md:col-span-8">
            <span className="sol-filter-label">Caixa / conta com controle diário</span>
            <select className="input w-full" value={contaSelecionadaId} onChange={(event) => setContaSelecionadaId(event.target.value)}>
              {contasFiltradas.length === 0 ? <option value="">Nenhuma conta configurada</option> : null}
              {contasFiltradas.map((conta) => <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>)}
            </select>
          </label>
          <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--ui-surface-soft)] px-3 py-2 text-sm md:col-span-4">
            {sessaoAberta
              ? <HiOutlineLockOpen className="h-4 w-4 shrink-0 text-[var(--sem-success)]" aria-hidden="true" />
              : <HiOutlineLockClosed className="h-4 w-4 shrink-0 text-[var(--c-muted)]" aria-hidden="true" />}
            <div className="min-w-0">
              <strong className="block truncate text-[var(--c-text)]">{sessaoAberta ? 'Caixa aberto' : 'Caixa fechado'}</strong>
              <span className="block truncate text-xs text-[var(--c-muted)]">{contaSelecionada ? empresaLabel(contaSelecionada) : 'Selecione uma conta'}</span>
            </div>
          </div>
        </div>
      </BlocoConteudo>

      {!contaSelecionada && !loading ? (
        <BlocoConteudo titulo="Nenhum caixa configurado">
          <p className="text-sm text-[var(--c-muted)]">
            Cadastre uma conta como <strong className="text-[var(--c-text)]">Caixa interno</strong> e habilite
            abertura e fechamento nos Cadastros Financeiros.
          </p>
        </BlocoConteudo>
      ) : null}

      {contaSelecionada && !sessaoAberta && !loading ? (
        <BlocoConteudo
          titulo="Abrir caixa"
          descricao={caixaFisico ? 'Informe o saldo inicial. O caixa físico não depende de conciliação OFX.' : 'Esta conta mantém a conferência OFX anterior.'}
          acoes={<span className={statusClass('FECHADO')}>FECHADO</span>}
        >
          <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-12 xl:items-end" onSubmit={handleAbrir}>
            <label className="sol-filter-field xl:col-span-2"><span className="sol-filter-label">Data de abertura *</span><input className="input w-full" type="date" value={abrirForm.data_abertura} onChange={(event) => setAbrirForm((current) => ({ ...current, data_abertura: event.target.value }))} required /></label>
            <label className="sol-filter-field xl:col-span-2"><span className="sol-filter-label">Saldo inicial</span><input className="input input-moeda w-full" inputMode="decimal" placeholder="Ex.: 500,00" value={abrirForm.saldo_abertura} onChange={(event) => setAbrirForm((current) => ({ ...current, saldo_abertura: event.target.value }))} /></label>
            <label className="sol-filter-field sm:col-span-2 xl:col-span-6"><span className="sol-filter-label">Observação de abertura</span><input className="input w-full" maxLength={4000} placeholder="Opcional" value={abrirForm.observacoes} onChange={(event) => setAbrirForm((current) => ({ ...current, observacoes: event.target.value }))} /></label>
            {/* D3: os dois pesos visíveis — "Abrir caixa" é a primária sólida,
                "Confirmar OFX" a secundária em contorno. */}
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 xl:col-span-2">{!caixaFisico ? <button type="button" className="btn btn-outline" onClick={handleConfirmarOfx} disabled={saving}>Confirmar OFX</button> : null}<button type="submit" className="btn btn-primary" disabled={saving}>Abrir caixa</button></div>
          </form>
        </BlocoConteudo>
      ) : null}

      {sessaoAberta ? <>
        <BlocoConteudo
          titulo={`Movimento do caixa · ${formatDate(sessaoAberta.data_abertura)}`}
          descricao="Resumo financeiro da sessão aberta."
          acoes={<span className={statusClass('ABERTO')}>ABERTO</span>}
        >
          {/* M2/R10: o ladrilho do sistema no lugar do `Metric` local, que
              escrevia medida e cor na tela. */}
          <StatGrid colunas={4}>
            <StatTile label="Saldo de abertura" valor={formatCurrency(sessaoAberta.saldo_abertura)} />
            <StatTile label="Entradas" valor={formatCurrency(resumo.total_entradas)} tom="success" />
            <StatTile label="Saídas" valor={formatCurrency(resumo.total_saidas)} tom="danger" />
            <StatTile
              label="Saldo no sistema"
              valor={formatCurrency(saldoSistema)}
              sub={`${resumo.quantidade_movimentos || 0} movimento(s)`}
              tom={saldoSistema < 0 ? 'danger' : undefined}
            />
          </StatGrid>
        </BlocoConteudo>

        {caixaFisico ? (
          <BlocoConteudo
            titulo="Registrar entrada ou saída"
            descricao="Use para dinheiro físico ainda não registrado por outro fluxo financeiro."
          >
            <form className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-12" onSubmit={handleMovimento}>
              {/* R12: select de FORMULÁRIO (entrada de dado do lançamento). */}
              <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Natureza *</span><select className="input mt-auto w-full" value={movimentoForm.natureza} onChange={(event) => setMovimentoForm((current) => ({ ...current, natureza: event.target.value }))}><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></label>
              <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Data *</span><input className="input mt-auto w-full" type="date" value={movimentoForm.data_movimento} onChange={(event) => setMovimentoForm((current) => ({ ...current, data_movimento: event.target.value }))} required /></label>
              <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Valor *</span><input className="input input-moeda mt-auto w-full" type="text" inputMode="decimal" value={movimentoForm.valor} onChange={(event) => setMovimentoForm((current) => ({ ...current, valor: normalizeCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" required /></label>
              <label className="sol-filter-field h-full sm:col-span-2 xl:col-span-3"><span className="sol-filter-label">Descrição *</span><input className="input mt-auto w-full" minLength={3} maxLength={4000} placeholder="Ex.: compra emergencial de material" value={movimentoForm.descricao} onChange={(event) => setMovimentoForm((current) => ({ ...current, descricao: event.target.value }))} required /></label>
              <label className="sol-filter-field h-full sm:col-span-2 xl:col-span-2"><span className="sol-filter-label">Documento / referência</span><input className="input mt-auto w-full" maxLength={120} placeholder="Recibo, NF ou controle" value={movimentoForm.documento_referencia} onChange={(event) => setMovimentoForm((current) => ({ ...current, documento_referencia: event.target.value }))} /></label>
              <div className="flex items-center justify-end sm:col-span-2 xl:col-span-1">
                <button type="submit" className="btn btn-primary" disabled={saving} title="Registrar entrada ou saída">
                  <HiOutlinePlus className="h-4 w-4" aria-hidden="true" />
                  Registrar
                </button>
              </div>
            </form>
          </BlocoConteudo>
        ) : null}

        <BlocoConteudo
          titulo="Livro do caixa"
          contagem={`${movimentos.length} registro(s)`}
          descricao="Entradas, saídas e transferências da sessão."
        >
          <TabelaPadrao
            colunas={[
              { id: 'data', titulo: 'Data', tipo: 'data', render: (movimento) => formatDate(movimento.data) },
              {
                id: 'natureza',
                titulo: 'Natureza',
                tipo: 'badge',
                render: (movimento) => (
                  <span className={movimento.natureza === 'ENTRADA' ? 'badge badge-success' : 'badge badge-danger'}>
                    {movimento.natureza === 'ENTRADA' ? 'Entrada' : 'Saída'}
                  </span>
                )
              },
              {
                id: 'descricao',
                titulo: 'Descrição',
                // R17: a descrição NOMEIA o movimento do livro de caixa.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (movimento) => (
                  <div>
                    <strong className="block text-[var(--c-text)]">{movimento.descricao}</strong>
                    {movimento.conta_contraparte ? <span className="text-xs text-[var(--c-muted)]">Contraparte: {movimento.conta_contraparte}</span> : null}
                  </div>
                )
              },
              { id: 'documento', titulo: 'Documento', tipo: 'codigo', render: (movimento) => movimento.documento || '-' },
              {
                id: 'origem',
                titulo: 'Origem',
                tipo: 'texto',
                render: (movimento) => (movimento.origem === 'TRANSFERENCIA' ? 'Transferência' : (movimento.tipo?.includes('MANUAL') ? 'Lançamento manual' : 'Financeiro'))
              },
              {
                id: 'valor',
                titulo: 'Valor',
                tipo: 'valor',
                render: (movimento) => (
                  <span className={`font-semibold ${movimento.natureza === 'ENTRADA' ? 'text-[var(--sem-success)]' : 'text-[var(--sem-danger)]'}`}>
                    {movimento.natureza === 'ENTRADA' ? '+' : '-'}{formatCurrency(movimento.valor)}
                  </span>
                )
              }
            ]}
            itens={movimentos}
            getId={(movimento) => `${movimento.origem}-${movimento.id}`}
            vazio="Nenhum movimento registrado nesta sessão."
            storageKey="tabela:financeiro-caixas:movimentos"
            rotuloRolagem="Livro do caixa"
            larguraAcoes={140}
            acoesLinha={(movimento) => (movimento.estornavel
              // D3/C5: a destrutiva fica visível, em vermelho suave e apartada.
              ? <button type="button" className="btn btn-outline btn-perigo-suave btn-sm" onClick={() => setEstorno({ movimento, motivo: '' })}>Estornar</button>
              : <span className="text-[var(--c-muted)]">-</span>)}
          />
        </BlocoConteudo>

        <BlocoConteudo
          titulo="Conferir e fechar caixa"
          descricao={`${caixaFisico ? 'Conte o dinheiro físico e informe o saldo encontrado.' : 'Confira o saldo operacional e informe o valor apurado.'} Divergências ficam registradas com justificativa.`}
        >
          <form className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-12" onSubmit={handleFechar}>
            <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Data de fechamento *</span><input className="input mt-auto w-full" type="date" min={dataMinimaFechamento} value={fecharForm.data_fechamento} onChange={(event) => setFecharForm((current) => ({ ...current, data_fechamento: event.target.value }))} required /></label>
            <label className="sol-filter-field h-full xl:col-span-2"><span className="sol-filter-label">Saldo contado *</span><input className="input input-moeda mt-auto w-full" type="text" inputMode="decimal" value={fecharForm.saldo_informado} onChange={(event) => setFecharForm((current) => ({ ...current, saldo_informado: normalizeCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" required /></label>
            <div className="xl:col-span-2">
              <StatTile
                label="Diferença"
                valor={formatCurrency(diferencaFechamento)}
                tom={diferencaRelevante ? 'warning' : 'success'}
                full
              />
            </div>
            <label className="sol-filter-field h-full sm:col-span-2 xl:col-span-4"><span className="sol-filter-label">Justificativa {diferencaRelevante ? '*' : ''}</span><input className="input mt-auto w-full" minLength={diferencaRelevante ? 10 : undefined} maxLength={4000} placeholder={diferencaRelevante ? 'Obrigatória para divergência' : 'Observação opcional'} value={fecharForm.observacoes} onChange={(event) => setFecharForm((current) => ({ ...current, observacoes: event.target.value }))} required={diferencaRelevante} /></label>
            <div className="flex items-center justify-end sm:col-span-2 xl:col-span-2">
              <button type="submit" className="btn btn-primary" disabled={saving} title="Fechar caixa">
                <HiOutlineLockClosed className="h-4 w-4" aria-hidden="true" />
                Fechar caixa
              </button>
            </div>
          </form>
        </BlocoConteudo>
      </> : null}

      {contaSelecionada ? (
        <BlocoConteudo
          titulo="Histórico de fechamentos"
          contagem={`${sessoesFechadas.length} fechamento(s)`}
          descricao="Conferências anteriores da conta selecionada."
          recolhivel
        >
          <TabelaPadrao
            colunas={[
              { id: 'abertura', titulo: 'Abertura', tipo: 'data', render: (sessao) => formatDate(sessao.data_abertura) },
              { id: 'fechamento', titulo: 'Fechamento', tipo: 'data', render: (sessao) => formatDate(sessao.data_fechamento) },
              { id: 'saldo_inicial', titulo: 'Saldo inicial', tipo: 'valor', render: (sessao) => formatCurrency(sessao.saldo_abertura) },
              { id: 'entradas', titulo: 'Entradas', tipo: 'valor', render: (sessao) => <span className="text-[var(--sem-success)]">{formatCurrency(sessao.total_entradas)}</span> },
              { id: 'saidas', titulo: 'Saídas', tipo: 'valor', render: (sessao) => <span className="text-[var(--sem-danger)]">{formatCurrency(sessao.total_saidas)}</span> },
              { id: 'saldo_contado', titulo: 'Saldo contado', tipo: 'valor', render: (sessao) => <span className="font-semibold">{formatCurrency(sessao.saldo_informado)}</span> },
              {
                id: 'diferenca',
                titulo: 'Diferença',
                tipo: 'valor',
                render: (sessao) => (
                  <span className={`font-semibold ${Math.abs(Number(sessao.diferenca || 0)) > 0.009 ? 'text-[var(--sem-warning)]' : 'text-[var(--sem-success)]'}`}>
                    {formatCurrency(sessao.diferenca)}
                  </span>
                )
              },
              {
                id: 'responsavel',
                titulo: 'Responsável',
                // R17: o responsável NOMEIA o fechamento conferido.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (sessao) => sessao.fechadoPor?.nome || '-'
              }
            ]}
            itens={sessoesFechadas}
            vazio="Nenhum fechamento registrado para esta conta."
            storageKey="tabela:financeiro-caixas:fechamentos"
            rotuloRolagem="Histórico de fechamentos"
          />
        </BlocoConteudo>
      ) : null}

      {loading ? (
        <BlocoConteudo titulo="Carregando controle de caixa">
          <p className="text-sm text-[var(--c-muted)]">Buscando a sessão e os movimentos da conta selecionada...</p>
        </BlocoConteudo>
      ) : null}

      {/*
        ESTORNO — continua um FORMULÁRIO em modal, não um `useConfirmacao`,
        e a razão é deliberada: o `campo` do hook só sabe "obrigatório", e
        aqui o motivo tem PISO DE 10 CARACTERES (`minLength={10}`), que é
        regra de auditoria de dinheiro. Trocar pelo hook hoje perderia essa
        validação em silêncio — exatamente a classe de defeito que a R21
        registra sobre mudar contrato de componente no meio da leva.
        Fica registrado como decisão do cliente (item 5 do relatório).

        O que mudou: a casca virou a do sistema (`OverlayModal`), no lugar
        do overlay à mão com `bg-slate-950/55`, e o texto passou a declarar
        que a operação não se desfaz.
      */}
      {estorno.movimento ? (
        <OverlayModal
          rotulo="Estornar movimento"
          largura="var(--modal-max-w-md, 640px)"
          onFechar={() => setEstorno({ movimento: null, motivo: '' })}
        >
          <form className="flex min-h-0 flex-col" onSubmit={handleEstornar}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--c-border)] p-4">
              <div>
                <h2 className="app-confirmacao-titulo">Estornar movimento</h2>
                <p className="text-sm text-[var(--c-muted)]">
                  O registro será preservado e marcado como estornado na auditoria. O estorno não pode ser desfeito por esta tela.
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setEstorno({ movimento: null, motivo: '' })} aria-label="Fechar">
                <HiOutlineXMark className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 space-y-3 overflow-y-auto p-4">
              {/* Consentimento: o movimento descrito aqui é o MESMO que
                  `handleEstornar` envia (`estorno.movimento.id`). */}
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--ui-surface-soft)] p-3 text-sm">
                <strong className="block text-[var(--c-text)]">{estorno.movimento.descricao}</strong>
                <span className="text-[var(--c-muted)]">{formatDate(estorno.movimento.data)} · {formatCurrency(estorno.movimento.valor)}</span>
              </div>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Motivo do estorno *</span>
                <textarea className="input min-h-24 w-full" minLength={10} maxLength={4000} value={estorno.motivo} onChange={(event) => setEstorno((current) => ({ ...current, motivo: event.target.value }))} placeholder="Explique o motivo com pelo menos 10 caracteres" required />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--c-border)] p-4">
              <button type="button" className="btn btn-outline" onClick={() => setEstorno({ movimento: null, motivo: '' })}>Cancelar</button>
              <button type="submit" className="btn btn-outline btn-perigo-suave" disabled={saving}>Confirmar estorno</button>
            </div>
          </form>
        </OverlayModal>
      ) : null}
    </Pagina>
  );
}
