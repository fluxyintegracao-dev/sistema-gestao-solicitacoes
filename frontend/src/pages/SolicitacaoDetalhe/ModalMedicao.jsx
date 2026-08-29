import { useEffect, useState } from 'react';
import OverlayModal from '../../components/ui/OverlayModal';
import { API_URL, authHeaders, fileUrl } from '../../services/api';
import { aprovarMedicaoContrato, atualizarMedicaoContrato } from '../../services/contratos';

const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR') : '');
const soData = (v) => (v ? String(v).slice(0, 10) : '');
const brData = (v) => (soData(v) ? soData(v).split('-').reverse().join('/') : '');
const moeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const periodo = (m) => {
  const ini = brData(m?.periodo_inicio);
  const fim = brData(m?.periodo_fim);
  return ini && fim ? `${ini} a ${fim}` : (ini || fim || 'Periodo nao informado');
};

const rotuloTipoAnexo = (tipo) => {
  const rotulos = {
    BOLETO: 'Boleto',
    COMPROVANTE: 'Comprovante',
    NOTA_FISCAL: 'Nota fiscal',
    ANEXO: 'Arquivo'
  };
  const chave = String(tipo || '').trim().toUpperCase();
  return rotulos[chave] || chave.replaceAll('_', ' ').toLowerCase() || 'Arquivo';
};

function normalizarUrlArquivo(url) {
  const valor = String(url || '');
  if (!valor.startsWith('http')) return valor;
  return valor.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
}

export default function ModalMedicao({
  medicao, historicos = [], parcelas = [], podeEditar = false, podeAprovar = false, onFechar, onSalvo
}) {
  const daMedicao = (Array.isArray(parcelas) ? parcelas : [])
    .filter((p) => p?.medicao && String(p.medicao.id) === String(medicao?.id || ''));

  const [edicao, setEdicao] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [abrindoAnexoId, setAbrindoAnexoId] = useState(null);

  useEffect(() => {
    const inicial = {};
    daMedicao.forEach((p) => {
      inicial[p.id] = { valor: String(Number(p.valor).toFixed(2)), vencimento: soData(p.vencimento) };
    });
    setEdicao(inicial);
    setErro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicao?.id, parcelas]);

  if (!medicao || typeof document === 'undefined') return null;

  const comentarios = (Array.isArray(historicos) ? historicos : [])
    .filter((h) => String(h?.medicao_id || '') === String(medicao.id));
  const anexos = [...(Array.isArray(medicao.anexos) ? medicao.anexos : [])]
    .sort((a, b) => Number(String(b?.tipo).toUpperCase() === 'BOLETO')
      - Number(String(a?.tipo).toUpperCase() === 'BOLETO'));
  const formaPagamento = medicao.forma_pagamento?.nome || medicao.forma_pagamento?.codigo || 'Nao informada';
  const favorecido = medicao.favorecido?.nome || 'Nao informado';
  const documentoFavorecido = medicao.favorecido?.cpf_cnpj || '';
  const ehPix = /PIX/i.test(`${medicao.forma_pagamento?.nome || ''} ${medicao.forma_pagamento?.tipo || ''}`);

  const temBaixa = (p) => Number(p?.titulo_valor_baixado || 0) > 0;
  const editaveis = daMedicao.filter((p) => !temBaixa(p));
  const podeSalvar = podeEditar && editaveis.length > 0;

  async function salvar() {
    setErro('');
    const itens = editaveis.map((p) => ({
      contrato_parcela_id: p.id,
      valor_medido: edicao[p.id]?.valor,
      vencimento: edicao[p.id]?.vencimento
    }));
    if (itens.some((i) => !i.valor_medido || !i.vencimento)) {
      setErro('Informe valor e vencimento de todas as parcelas.');
      return;
    }
    setSalvando(true);
    try {
      await atualizarMedicaoContrato(medicao.id, itens);
      onSalvo?.();
      onFechar?.();
    } catch (e) {
      setErro(e.message || 'Nao foi possivel alterar a medicao.');
    } finally {
      setSalvando(false);
    }
  }

  async function aprovar() {
    setErro('');
    setAprovando(true);
    try {
      await aprovarMedicaoContrato(medicao.id);
      onSalvo?.();
      onFechar?.();
    } catch (e) {
      setErro(e.message || 'Nao foi possivel aprovar a medicao.');
    } finally {
      setAprovando(false);
    }
  }

  async function abrirAnexo(anexo) {
    setErro('');
    setAbrindoAnexoId(anexo.id);
    try {
      const caminho = String(anexo.caminho_arquivo || '');
      if (!caminho) throw new Error('Arquivo sem endereco para abertura.');

      let url = fileUrl(caminho);
      if (caminho.startsWith('http')) {
        const params = new URLSearchParams({ url: normalizarUrlArquivo(caminho) });
        const resposta = await fetch(`${API_URL}/anexos/presign?${params.toString()}`, {
          headers: authHeaders()
        });
        const dados = await resposta.json().catch(() => null);
        if (!resposta.ok || !dados?.url) {
          throw new Error(dados?.error || 'Nao foi possivel gerar o link seguro do arquivo.');
        }
        url = dados.url;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErro(e.message || 'Nao foi possivel abrir o arquivo.');
    } finally {
      setAbrindoAnexoId(null);
    }
  }

  return (
    <OverlayModal
      aberto
      largura="var(--modal-max-w-lg, 860px)"
      rotulo={`Medicao ${medicao.numero}`}
      onFechar={onFechar}
    >
      <div data-testid="modal-medicao" className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--c-border)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--c-text)]">Medicao {medicao.numero}</h3>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: medicao.aprovada_em ? 'var(--c-success-soft, #dcfce7)' : 'var(--c-warning-soft, #fef3c7)',
                  color: medicao.aprovada_em ? 'var(--c-success, #15803d)' : 'var(--c-warning-strong, #92400e)'
                }}
              >
                {medicao.aprovada_em ? 'Aprovada' : 'Pendente de aprovacao'}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--c-muted)]">Periodo: {periodo(medicao)}</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={onFechar}>Fechar</button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-4">
          {erro && <div className="app-alert app-alert--error">{erro}</div>}

          <section aria-labelledby="conferencia-medicao">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--c-border)] pb-2">
              <div>
                <h4 id="conferencia-medicao" className="text-sm font-semibold text-[var(--c-text)]">
                  Conferencia para aprovacao
                </h4>
                <p className="mt-0.5 text-xs text-[var(--c-muted)]">
                  Dados informados para o pagamento desta medicao.
                </p>
              </div>
              {podeAprovar && !medicao.aprovada_em && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  data-testid="aprovar-medicao"
                  disabled={aprovando}
                  onClick={aprovar}
                >
                  {aprovando ? 'Aprovando...' : 'Aprovar e enviar ao Financeiro'}
                </button>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-3 py-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--c-muted)]">
                  Forma de pagamento
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-[var(--c-text)]">{formaPagamento}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--c-muted)]">
                  Favorecido
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-[var(--c-text)]">{favorecido}</dd>
                {documentoFavorecido && <dd className="text-xs text-[var(--c-muted)]">{documentoFavorecido}</dd>}
              </div>
              {ehPix && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--c-muted)]">
                    Chave PIX
                  </dt>
                  <dd className="mt-0.5 break-all text-sm text-[var(--c-text)]">
                    {medicao.favorecido_chave_pix || 'Nao informada'}
                  </dd>
                </div>
              )}
              {medicao.favorecido_contato && (
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--c-muted)]">
                    {ehPix ? 'Contato' : 'Dados para pagamento'}
                  </dt>
                  <dd className="mt-0.5 text-sm text-[var(--c-text)]">{medicao.favorecido_contato}</dd>
                </div>
              )}
            </dl>

            <div className="border-t border-[var(--c-border)] pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--c-muted)]">
                  Arquivos da medicao
                </span>
                <span className="text-xs text-[var(--c-muted)]">{anexos.length} arquivo(s)</span>
              </div>
              {anexos.length === 0 ? (
                <p className="py-3 text-sm text-[var(--c-muted)]">Nenhum arquivo vinculado a esta medicao.</p>
              ) : (
                <div className="mt-1 divide-y divide-[var(--c-border)]">
                  {anexos.map((anexo) => (
                    <div key={anexo.id} className="flex items-center gap-3 py-2">
                      <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--c-muted)]">
                        {rotuloTipoAnexo(anexo.tipo)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--c-text)]" title={anexo.nome_original}>
                        {anexo.nome_original || 'Arquivo sem nome'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm shrink-0"
                        disabled={abrindoAnexoId === anexo.id}
                        onClick={() => abrirAnexo(anexo)}
                      >
                        {abrindoAnexoId === anexo.id ? 'Abrindo...' : 'Abrir'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {medicao.aprovada_em && (
              <p className="border-t border-[var(--c-border)] pt-3 text-xs" style={{ color: 'var(--c-success, #15803d)' }}>
                Aprovada em {dataHora(medicao.aprovada_em)} e liberada para o Financeiro.
              </p>
            )}
          </section>

          {daMedicao.length > 0 && (
            <section aria-labelledby="parcelas-medicao">
              <div className="border-b border-[var(--c-border)] pb-2">
                <h4 id="parcelas-medicao" className="text-sm font-semibold text-[var(--c-text)]">
                  Parcelas desta medicao
                </h4>
              </div>

              <div className="divide-y divide-[var(--c-border)]">
                {daMedicao.map((p) => (
                  <div key={p.id} className="grid items-center gap-2 py-3 md:grid-cols-[92px_1fr_1fr_90px]">
                    <div>
                      <span className="text-sm font-medium text-[var(--c-text)]">Parcela {p.numero}</span>
                      <span className="block text-[11px] text-[var(--c-muted)]">{p.situacao || p.status}</span>
                    </div>

                    {podeEditar && !temBaixa(p) ? (
                      <>
                        <label className="grid gap-1 text-xs text-[var(--c-muted)]">
                          Valor
                          <input
                            className="input input-sm"
                            type="text"
                            inputMode="decimal"
                            data-testid={`medicao-valor-${p.numero}`}
                            value={edicao[p.id]?.valor ?? ''}
                            onChange={(e) => setEdicao((s) => ({ ...s, [p.id]: { ...s[p.id], valor: e.target.value } }))}
                          />
                        </label>
                        <label className="grid gap-1 text-xs text-[var(--c-muted)]">
                          Vencimento
                          <input
                            className="input input-sm"
                            type="date"
                            data-testid={`medicao-vencimento-${p.numero}`}
                            value={edicao[p.id]?.vencimento ?? ''}
                            onChange={(e) => setEdicao((s) => ({ ...s, [p.id]: { ...s[p.id], vencimento: e.target.value } }))}
                          />
                        </label>
                        <span className="text-right text-xs text-[var(--c-muted)]">Editavel</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-[var(--c-text)]">{moeda(p.valor)}</span>
                        <span className="text-sm text-[var(--c-text)]">{brData(p.vencimento)}</span>
                        <span className="text-right text-xs text-[var(--c-muted)]">
                          {temBaixa(p) ? `Pago ${moeda(p.titulo_valor_baixado)}` : 'Somente leitura'}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {podeSalvar && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--c-border)] pt-3">
                  <span className="max-w-xl text-xs text-[var(--c-muted)]">
                    A diferenca de valor e redistribuida nas ultimas parcelas do contrato.
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    data-testid="salvar-medicao"
                    disabled={salvando}
                    onClick={salvar}
                  >
                    {salvando ? 'Salvando...' : 'Salvar alteracoes'}
                  </button>
                </div>
              )}

              {!podeEditar && (
                <p className="border-t border-[var(--c-border)] pt-3 text-xs text-[var(--c-muted)]" data-testid="medicao-sem-permissao">
                  Alterar uma medicao exige permissao especifica.
                </p>
              )}
            </section>
          )}

          {comentarios.length > 0 && (
            <section aria-labelledby="comentarios-medicao">
              <h4 id="comentarios-medicao" className="border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
                Comentarios da medicao
              </h4>
              <div className="divide-y divide-[var(--c-border)]">
                {comentarios.map((h) => (
                  <div key={h.id} className="py-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--c-text)]">
                        {h.usuario?.nome || h.setor || 'Sistema'}
                      </span>
                      <span className="text-xs text-[var(--c-muted)]">{dataHora(h.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--c-text)]">{h.observacao || h.descricao || h.acao}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </OverlayModal>
  );
}
