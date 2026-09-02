import { useEffect, useMemo, useState } from 'react';
import { TabelaPadrao } from '../components/padrao';
import { getMinhasObras } from '../services/obras';
import { getContratoObraCategorias, getApropriacoesDaObra } from '../services/configuracoesSistema';
import { criarContratoFluxoNovo, aprovarContratoFluxoNovo, rejeitarContratoFluxoNovo } from '../services/contratos';
import { buscarParceiros } from '../services/parceiros';

/**
 * Criacao de contrato do fluxo novo (wireframe 1).
 *
 * Tela propria, fora da NovaSolicitacao monolitica que atende o fluxo antigo em producao.
 * A previa de parcelas e o saldo ESPELHAM as regras do backend (centavos inteiros, sobra na
 * ultima, redistribuicao nas ultimas) — o backend continua sendo a fonte da verdade e
 * revalida tudo na gravacao.
 */

const LIMITE_DETALHES = 50000;

// Conversao por DIGITOS, igual ao backend: toFixed arredonda o binario e divergia do
// DECIMAL do MySQL (8333.335 -> tela 8333,33 x banco 8333,34 — F2 da auditoria).
function paraCentavos(v) {
  const texto = String(v ?? '').trim();
  if (!texto || !Number.isFinite(Number(texto))) return NaN;
  const neg = texto.startsWith('-');
  const [i = '0', f = ''] = texto.replace(/^[-+]/, '').split('.');
  let cent = parseInt(i || '0', 10) * 100 + parseInt((f + '00').slice(0, 2), 10);
  if (f.length > 2 && Number(f[2]) >= 5) cent += 1;
  return neg ? -cent : cent;
}

function gerarPrevia(valorTotal, qtde, primeiroVencimento) {
  const total = paraCentavos(valorTotal);
  const n = Number(qtde);
  if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(n) || n < 1 || !primeiroVencimento) return [];
  const base = Math.floor(total / n);
  const sobra = total - base * n;
  const [ano, mes, dia] = primeiroVencimento.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const alvo = new Date(ano, mes - 1 + i, 1);
    const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    alvo.setDate(Math.min(dia, ultimo));
    return {
      numero: i + 1,
      valor: (i === n - 1 ? base + sobra : base) / 100,
      vencimento: `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`
    };
  });
}

export default function ContratoFluxoNovo() {
  const [obras, setObras] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [apropriacoesObra, setApropriacoesObra] = useState([]);
  const [form, setForm] = useState({
    obra_id: '', parceiro_id: '', ref_contrato: '', objeto: '', detalhes_contratacao: '',
    valor_total: '', qtde_parcelas: '', primeiro_vencimento: '', categoria_financeira_id: '',
    forma_pagamento_id: '2', apropriacao_id: ''
  });
  const [parcelas, setParcelas] = useState([]);
  const [credorBusca, setCredorBusca] = useState('');
  const [credorResultados, setCredorResultados] = useState([]);
  const [credorNome, setCredorNome] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      setObras(await getMinhasObras({ modo: 'CRIACAO', escopo: 'TODOS' }).catch(() => []));
      const cfg = await getContratoObraCategorias().catch(() => null);
      const permitidas = new Set((cfg?.categoria_ids || []).map(Number));
      setCategorias((cfg?.categorias_disponiveis || []).filter((c) => permitidas.has(Number(c.id))));
    })();
  }, []);

  useEffect(() => {
    if (!form.obra_id) { setApropriacoesObra([]); return; }
    getApropriacoesDaObra(form.obra_id).then((d) => setApropriacoesObra(d?.apropriacoes || [])).catch(() => setApropriacoesObra([]));
  }, [form.obra_id]);

  // Previa regenerada quando valor/qtde/vencimento mudam.
  useEffect(() => {
    setParcelas(gerarPrevia(form.valor_total, form.qtde_parcelas, form.primeiro_vencimento));
  }, [form.valor_total, form.qtde_parcelas, form.primeiro_vencimento]);

  const totalCent = paraCentavos(form.valor_total) || 0;
  const somaParcelasCent = parcelas.reduce((a, p) => a + paraCentavos(p.valor), 0);
  // Saldo em tempo real: o que do valor do contrato ainda nao esta coberto pelas parcelas.
  const saldoCent = totalCent - somaParcelasCent;

  function editarParcela(numero, novoValor) {
    // Redistribui nas ULTIMAS (espelha o backend): diferenca vai para a ultima parcela
    // livre e retrocede se consumi-la. Total do contrato nunca muda.
    const novoCent = paraCentavos(novoValor);
    if (!Number.isFinite(novoCent) || novoCent < 0) return;
    const lista = parcelas.map((p) => ({ ...p, cent: paraCentavos(p.valor) }));
    const alvo = lista.find((p) => p.numero === numero);
    if (!alvo) return;
    let diferenca = novoCent - alvo.cent;
    alvo.cent = novoCent;
    for (const p of [...lista].sort((a, b) => b.numero - a.numero)) {
      if (diferenca === 0) break;
      if (p.numero === numero) continue;
      if (diferenca > 0) { const c = Math.min(p.cent, diferenca); p.cent -= c; diferenca -= c; }
      else { p.cent += -diferenca; diferenca = 0; }
    }
    if (diferenca !== 0) { setErro('O valor excede o saldo do contrato.'); return; }
    setErro('');
    setParcelas(lista.map(({ cent, ...p }) => ({ ...p, valor: cent / 100 })));
  }

  async function salvar() {
    setSalvando(true); setErro(''); setSucesso(null);
    try {
      const r = await criarContratoFluxoNovo({
        obra_id: Number(form.obra_id),
        parceiro_id: Number(form.parceiro_id),
        ref_contrato: form.ref_contrato,
        objeto: form.objeto,
        detalhes_contratacao: form.detalhes_contratacao,
        valor_total: Number(form.valor_total),
        qtde_parcelas: Number(form.qtde_parcelas),
        // A lista da tela (inclusive edicoes com redistribuicao) e o que o backend grava;
        // ele valida soma exata e quantidade — nunca regenera em silencio (F1).
        parcelas: parcelas.map((p) => ({ numero: p.numero, valor: p.valor, vencimento: p.vencimento })),
        primeiro_vencimento: form.primeiro_vencimento,
        categoria_financeira_id: Number(form.categoria_financeira_id),
        forma_pagamento_id: Number(form.forma_pagamento_id),
        apropriacoes: [{ apropriacao_id: Number(form.apropriacao_id), percentual: 100 }]
      });
      setSucesso(r.contrato);
    } catch (e) { setErro(e.message); } finally { setSalvando(false); }
  }

  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const exigeDetalhes = Number(form.valor_total) > LIMITE_DETALHES;

  return (
    <div className="page solicitacoes-page">
      <h1 className="page-title">Novo contrato</h1>
      <p className="text-sm mt-1" style={{ color: 'var(--c-muted)' }}>
        O contrato e criado aguardando aprovacao; as parcelas so entram no financeiro quando aprovado.
      </p>

      <div className="card space-y-3">
        {erro && <div className="app-alert app-alert--error">{erro}</div>}
        {sucesso && (
          <div className="app-alert app-alert--success">
            Contrato {sucesso.codigo} criado — aguardando aprovacao.
            {sucesso.status_contrato === 'AGUARDANDO_APROVACAO' && (
              <span style={{ marginLeft: 12 }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={async () => {
                  try { const r = await aprovarContratoFluxoNovo(sucesso.id); setSucesso({ ...sucesso, status_contrato: r.contrato.status_contrato }); setErro(''); }
                  catch (e) { setErro(e.message); }
                }}>Aprovar</button>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} onClick={async () => {
                  const motivo = window.prompt('Motivo da rejeicao:');
                  if (!motivo) return;
                  try { const r = await rejeitarContratoFluxoNovo(sucesso.id, motivo); setSucesso({ ...sucesso, status_contrato: r.contrato.status_contrato }); setErro(''); }
                  catch (e) { setErro(e.message); }
                }}>Rejeitar</button>
              </span>
            )}
            {sucesso.status_contrato === 'ATIVO' && <strong style={{ marginLeft: 8 }}>APROVADO</strong>}
            {sucesso.status_contrato === 'REJEITADO' && <strong style={{ marginLeft: 8 }}>REJEITADO</strong>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="text-sm">Obra
            <select className="input" value={form.obra_id} onChange={campo('obra_id')}>
              <option value="">Selecione</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </label>
          <label className="text-sm" style={{ position: 'relative' }}>Credor
            <input className="input" value={credorNome || credorBusca}
              placeholder="Digite para buscar"
              onChange={async (e) => {
                const termo = e.target.value;
                setCredorNome(''); setCredorBusca(termo);
                setForm((f) => ({ ...f, parceiro_id: '' }));
                if (termo.length < 2) { setCredorResultados([]); return; }
                const r = await buscarParceiros({ q: termo }).catch(() => []);
                setCredorResultados((Array.isArray(r) ? r : r?.parceiros || []).slice(0, 8));
              }} />
            {credorResultados.length > 0 && (
              <div className="card" style={{ position: 'absolute', zIndex: 10, width: '100%', padding: 4 }}>
                {credorResultados.map((pRes) => (
                  <button key={pRes.id} type="button" className="btn btn-outline btn-sm"
                    style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 2 }}
                    onClick={() => { setForm((f) => ({ ...f, parceiro_id: pRes.id })); setCredorNome(pRes.nome); setCredorResultados([]); }}>
                    {pRes.nome} {pRes.cpf_cnpj ? '(' + pRes.cpf_cnpj + ')' : ''}
                  </button>
                ))}
              </div>
            )}
          </label>
          <label className="text-sm">Referencia
            <input className="input" value={form.ref_contrato} onChange={campo('ref_contrato')} />
          </label>
          <label className="text-sm">Categoria financeira
            <select className="input" value={form.categoria_financeira_id} onChange={campo('categoria_financeira_id')}>
              <option value="">Selecione</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label className="text-sm">Apropriacao
            <select className="input" value={form.apropriacao_id} onChange={campo('apropriacao_id')}>
              <option value="">Selecione</option>
              {apropriacoesObra.map((a) => <option key={a.id} value={a.id}>{a.codigo} — {a.descricao}</option>)}
            </select>
          </label>
          <label className="text-sm">Valor total
            <input className="input" type="number" step="0.01" value={form.valor_total} onChange={campo('valor_total')} />
          </label>
          <label className="text-sm">Qtde parcelas
            <input className="input" type="number" min="1" value={form.qtde_parcelas} onChange={campo('qtde_parcelas')} />
          </label>
          <label className="text-sm">1º vencimento
            <input className="input" type="date" value={form.primeiro_vencimento} onChange={campo('primeiro_vencimento')} />
          </label>
          <div className="text-sm" style={{ alignSelf: 'end' }}>
            <strong>Saldo:</strong> R$ {(saldoCent / 100).toFixed(2)}
          </div>
        </div>

        {/* A negociacao detalhada virou DOCUMENTO (20/08). Esta tela nao tem o campo de anexo — ela
            cria o contrato antes de existir um contrato a que anexar —, entao aqui fica o aviso.
            Deixar o textarea seria pior: a pessoa preencheria achando que cumpriu a exigencia, e o
            contrato travaria na aprovacao do mesmo jeito, porque o backend cobra o arquivo. */}
        {exigeDetalhes && (
          <div className="app-alert app-alert--warning" data-testid="aviso-negociacao">
            Acima do limite do Juridico a negociacao detalhada e obrigatoria e precisa ser um
            documento (.docx ou .pdf). Depois de criar, anexe o documento pela Gestao de Contratos —
            sem ele o contrato nao pode ser aprovado.
          </div>
        )}

        {parcelas.length > 0 && (
          <TabelaPadrao
            colunas={[
              {
                id: 'numero',
                titulo: '#',
                tipo: 'codigo',
                noCard: 'titulo',
                render: (p) => p.numero
              },
              {
                id: 'valor',
                titulo: 'Valor',
                tipo: 'valor',
                render: (p) => (
                  <input className="input" type="number" step="0.01"
                    value={p.valor}
                    onChange={(e) => editarParcela(p.numero, e.target.value)} />
                )
              },
              {
                id: 'vencimento',
                titulo: 'Vencimento',
                tipo: 'data',
                render: (p) => p.vencimento
              },
              {
                id: 'status',
                titulo: 'Status',
                tipo: 'status',
                render: () => 'Previsao'
              }
            ]}
            itens={parcelas}
            getId={(p) => p.numero}
            storageKey="tabela:contrato-fluxo-novo:parcelas"
            rotuloRolagem="Previa de parcelas"
            vazio="Nenhuma parcela prevista"
            /* R17: previa de parcelas — numero, valor, vencimento e status; nao
               ha nome de registro a exibir, a parcela e identificada pelo numero. */
            semIdentidade
          />
        )}

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}
