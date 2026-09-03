import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getOpcoesFormularioContrato, getTetoAditivo, solicitarAditivoContrato } from '../../services/contratos';
import { formatCurrencyBRL, normalizeCurrencyTyping, parseCurrencyInput } from '../../utils/formatters';

/**
 * Modal do TERMO ADITIVO (PI-15).
 *
 * O aditivo deixou de ser um subtipo da Nova Solicitacao e virou uma ACAO sobre o contrato:
 * um botao na tela de medicao abre este modal. Vale para contrato do fluxo ANTIGO e do NOVO —
 * nada aqui olha `fluxo_novo`, porque a regra do aditivo e a mesma nos dois.
 *
 * O teto de 25% e calculado no BACKEND e apenas exibido aqui: a tela nao recalcula regra de
 * dinheiro. O backend reconfere na solicitacao e de novo na aprovacao, e e ele quem decide.
 * O aviso local existe so para o usuario nao perder a digitacao ate o servidor responder.
 *
 * Independente da solicitacao em curso: pedir o aditivo nao envia nem valida a medicao que a
 * pessoa esta preenchendo. Sao dois atos separados, e misturar os dois faria o usuario perder o
 * formulario.
 *
 * VAI EM PORTAL PARA O BODY, e isso nao e detalhe de estilo — sao duas coisas que so o portal
 * resolve (medidas conferidas na tela, nao deduzidas):
 *
 *   1) `main.layout-main` tem `position: relative; z-index: 1`, o que CRIA UM CONTEXTO DE
 *      EMPILHAMENTO. Dentro dele, o `z-index: 50` do modal so disputa entre irmaos do main — e o
 *      main inteiro vale 1 contra a sidebar, que vale 40. Nenhum valor de z-index no modal
 *      resolveria: o teto e o do ancestral. Fora do main, o modal disputa no nivel do body.
 *   2) `responsive-system.css` tem `.layout-main :where(..., .card, ...) { max-width: 100% }`.
 *      O `:where()` zera a propria especificidade, mas o `.layout-main` nao: a regra EMPATA com o
 *      utilitario de largura e vence pela ordem de importacao. Resultado: o painel esticava para
 *      1408px numa viewport de 1440. Fora do `.layout-main`, a regra deixa de casar.
 *
 * As medidas saem dos tokens do proprio projeto (`--modal-max-w-lg`, `--z-modal`) em vez de
 * utilitario, para a largura nao voltar a depender de quem e importado por ultimo.
 */

const moeda = (v) => formatCurrencyBRL(v);

function formatarDataContrato(valor) {
  const partes = String(valor || '').slice(0, 10).split('-');
  if (partes.length !== 3 || partes.some((parte) => !parte)) return '';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function rotuloVigenciaAtual(contrato) {
  const inicio = formatarDataContrato(contrato?.vigencia_inicio);
  const fim = formatarDataContrato(contrato?.vigencia_fim);
  if (inicio && fim) return `${inicio} a ${fim}`;
  if (fim) return `Até ${fim}`;
  if (inicio) return `Desde ${inicio}`;
  return 'Não informada';
}

// `tipo` comeca VAZIO de proposito: o cliente pediu que informar seja OBRIGATORIO, e um padrao
// escolhido pela tela seria a decisao sendo tomada por quem nao devia. E ele que decide o que a
// aprovacao faz — uma parcela com o vencimento antigo, ou varias ate um prazo novo.
const CAMPOS_VAZIOS = {
  tipo: '', valor: '', nova_vigencia_fim: '', qtde_parcelas: '', justificativa: '', responsavel_id: ''
};

export default function ModalAditivoContrato({ contratoId, contratoRotulo, areaResponsavel, aberto, onFechar, onSolicitado }) {
  const [teto, setTeto] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);

  // Recarrega o teto toda vez que abre: entre uma abertura e outra outro aditivo pode ter sido
  // aprovado, e mostrar um disponivel velho induziria a pessoa a pedir um valor que sera negado.
  useEffect(() => {
    if (!aberto || !contratoId) return undefined;
    let cancelado = false;
    setErro('');
    setCampos(CAMPOS_VAZIOS);
    setTeto(null);
    setCarregando(true);

    getTetoAditivo(contratoId)
      .then(async (r) => {
        if (cancelado) return;
        setTeto(r);

        try {
          const opcoes = await getOpcoesFormularioContrato({ obraId: r?.contrato?.obra_id });
          if (cancelado) return;
          const lista = Array.isArray(opcoes?.usuarios) ? opcoes.usuarios : [];
          const responsavelContratoId = r?.contrato?.responsavel_id;
          setUsuarios(lista);
          setCampos((atuais) => ({
            ...atuais,
            responsavel_id: lista.some((u) => String(u.id) === String(responsavelContratoId))
              ? String(responsavelContratoId)
              : ''
          }));
        } catch (e) {
          if (!cancelado) {
            setUsuarios([]);
            setErro(e.message || 'Erro ao carregar os responsaveis vinculados a obra.');
          }
        }
      })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Erro ao carregar o limite de aditivo.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [aberto, contratoId]);

  // Centralizar na viewport deixa o modal visualmente A ESQUERDA, porque o menu ocupa ~286px que
  // nao sao area util. Entao o overlay cobre a tela inteira (escurece o menu e bloqueia o clique
  // nele), mas o painel e centralizado sobre a AREA DE CONTEUDO.
  //
  // A borda do conteudo e MEDIDA, nao fixada: o menu recolhe, e no celular vira gaveta e comeca em
  // zero. Medida fixa daria certo num estado e errado nos outros.
  const [recuoConteudo, setRecuoConteudo] = useState(0);
  useEffect(() => {
    if (!aberto || typeof document === 'undefined') return undefined;
    const medir = () => {
      const principal = document.querySelector('.layout-main');
      setRecuoConteudo(principal ? Math.max(0, Math.round(principal.getBoundingClientRect().left)) : 0);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [aberto]);

  if (!aberto) return null;

  const valorNumero = parseCurrencyInput(campos.valor);
  const passaDoTeto = Boolean(teto) && campos.tipo !== 'PRAZO' && valorNumero > Number(teto.disponivel);
  // O backend informa se o contrato aceita aditivo (encerrado ou inativo nao aceita). A tela
  // obedece esse campo em vez de reimplementar a regra.
  const contratoAceita = teto ? teto.aceita_aditivo !== false : true;
  const ehVigencia = campos.tipo === 'VALOR_E_VIGENCIA' || campos.tipo === 'PRAZO';
  // Aditivo de PRAZO nao acrescenta dinheiro: o valor ja esta no contrato, parado numa parcela que
  // ninguem mediu. O campo Valor some, e o teto de 25% deixa de valer para ele.
  const soPrazo = campos.tipo === 'PRAZO';
  const qtdeParcelas = Number(campos.qtde_parcelas) || 0;
  // Aditivo de vigencia exige o prazo novo E quantas parcelas criar: sem os dois o sistema nao tem
  // como distribuir o valor no tempo, e foi o cliente quem pediu que a pessoa informasse.
  const vigenciaCompleta = !ehVigencia || (Boolean(campos.nova_vigencia_fim) && qtdeParcelas >= 1);

  const podeEnviar = Boolean(teto)
    && contratoAceita
    && Boolean(campos.tipo)
    && vigenciaCompleta
    && (soPrazo || valorNumero > 0)
    && String(campos.justificativa || '').trim().length > 0
    && !passaDoTeto
    && !enviando;

  const campo = (k) => (e) => setCampos((c) => ({ ...c, [k]: e.target.value }));

  async function enviar() {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro('');
    try {
      const r = await solicitarAditivoContrato(Number(contratoId), {
        tipo: campos.tipo,
        valor: soPrazo ? 0 : valorNumero,
        // Aditivo so de valor nao manda prazo nem quantidade: o prazo final nao mudou.
        nova_vigencia_fim: ehVigencia ? campos.nova_vigencia_fim : null,
        qtde_parcelas: ehVigencia ? qtdeParcelas : null,
        justificativa: String(campos.justificativa).trim(),
        responsavel_id: campos.responsavel_id ? Number(campos.responsavel_id) : null,
        // PI-16: no contrato LEGADO o aditivo abre uma solicitacao propria, e ela precisa de um
        // setor. No fluxo novo o backend ignora isto e usa a solicitacao que ja existe.
        area_responsavel: areaResponsavel || null
      });
      onSolicitado?.(r);
      onFechar?.();
    } catch (e) {
      setErro(e.message || 'Erro ao solicitar aditivo.');
    } finally {
      setEnviando(false);
    }
  }

  const conteudo = (
    <div
      className="fixed inset-0 flex items-center justify-center py-6"
      style={{
        zIndex: 'var(--z-modal, 50)',
        background: 'var(--modal-overlay, rgba(15, 23, 42, 0.48))',
        // O recuo do menu entra como padding: o overlay segue cobrindo tudo, mas a centralizacao
        // do flex passa a valer sobre a area de conteudo. Com o menu recolhido ou em gaveta o
        // recuo e zero e o modal volta a centralizar na viewport inteira, sozinho.
        paddingLeft: `calc(${recuoConteudo}px + 1rem)`,
        paddingRight: '1rem'
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Solicitar termo aditivo"
    >
      <div
        className="card overflow-hidden"
        data-testid="modal-aditivo"
        style={{
          width: 'min(100%, var(--modal-max-w-lg, 860px))',
          maxHeight: 'min(88vh, 920px)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--c-text)]">Solicitar termo aditivo</h3>
            {contratoRotulo && (
              <p className="mt-1 text-xs text-[var(--c-muted)]">{contratoRotulo}</p>
            )}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onFechar}>Fechar</button>
        </div>

        {/* Corpo rolavel: em tela baixa o modal nao pode empurrar rodape para fora da viewport. */}
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          {erro && <div className="app-alert app-alert--error">{erro}</div>}
          {carregando && <p className="text-sm text-[var(--c-muted)]">Carregando o limite do contrato...</p>}

          {teto && !contratoAceita && (
            <div className="app-alert app-alert--error">
              Este contrato esta encerrado ou inativo e nao aceita termo aditivo.
            </div>
          )}

          {teto && (
            <div className="text-sm" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span><strong>Valor original:</strong> {moeda(teto.valor_original)}</span>
              {/* O teto e sobre o valor ORIGINAL e acumula os aditivos ja aprovados (PI-13). */}
              <span><strong>Limite de {teto.percentual_maximo}%:</strong> {moeda(teto.teto)}</span>
              <span><strong>Já aprovado:</strong> {moeda(teto.usado)}</span>
              <span><strong>Disponível:</strong> {moeda(teto.disponivel)}</span>
            </div>
          )}

          {teto && (
            <div
              className="text-sm"
              style={{
                borderTop: '1px solid var(--c-border)',
                borderBottom: '1px solid var(--c-border)',
                padding: '8px 0'
              }}
            >
              <strong>Vigência atual:</strong>{' '}
              <span style={{ color: 'var(--c-muted)' }}>{rotuloVigenciaAtual(teto.contrato)}</span>
            </div>
          )}

          {passaDoTeto && (
            <div className="app-alert app-alert--error">
              O valor do aditivo passa do limite disponível ({moeda(teto.disponivel)}).
            </div>
          )}

          {/* O TIPO vem primeiro porque e ele que decide quais campos importam abaixo — e o que a
              aprovacao vai fazer com o valor. Sem escolha, o botao nao libera. */}
          <fieldset className="text-sm" style={{ border: 0, padding: 0, margin: '0 0 8px' }}>
            <legend style={{ padding: 0, marginBottom: 4 }}>Este aditivo é de *</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="aditivo_tipo"
                  value="VALOR"
                  checked={campos.tipo === 'VALOR'}
                  onChange={campo('tipo')}
                  disabled={!contratoAceita}
                />
                <span>Somente valor</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="aditivo_tipo"
                  value="VALOR_E_VIGENCIA"
                  checked={campos.tipo === 'VALOR_E_VIGENCIA'}
                  onChange={campo('tipo')}
                  disabled={!contratoAceita}
                />
                <span>Valor e nova vigência</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="aditivo_tipo"
                  value="PRAZO"
                  checked={campos.tipo === 'PRAZO'}
                  onChange={campo('tipo')}
                  disabled={!contratoAceita}
                />
                <span>Somente prazo</span>
              </label>
            </div>
            <span className="text-xs" style={{ color: 'var(--c-muted)' }}>
              {campos.tipo === 'VALOR'
                ? 'O prazo final do contrato nao muda. O valor entra na ultima parcela ainda livre; se ela ja foi medida, nasce uma parcela nova com o mesmo vencimento da ultima.'
                : campos.tipo === 'VALOR_E_VIGENCIA'
                  ? 'Informe o novo prazo e quantas parcelas devem ser criadas. Os vencimentos podem ser ajustados depois, conforme a necessidade de medicao.'
                  : campos.tipo === 'PRAZO'
                    ? 'Sem dinheiro novo: o saldo que ainda nao foi medido e redistribuido nas parcelas que voce pedir, ate o novo prazo. Use quando o contrato venceu e ainda ha saldo a medir.'
                    : 'Escolha uma das opcoes: e por aqui que o sistema sabe quantas parcelas criar quando o aditivo for aprovado.'}
            </span>
          </fieldset>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {!soPrazo && (
              <label className="text-sm">Valor do aditivo *
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  name="aditivo_valor"
                  value={campos.valor}
                  onChange={(e) => setCampos((atuais) => ({
                    ...atuais,
                    valor: normalizeCurrencyTyping(e.target.value)
                  }))}
                  placeholder="R$ 0,00"
                  disabled={!contratoAceita}
                />
              </label>
            )}
            {/* Prazo e quantidade so aparecem no aditivo de vigencia: no de valor o prazo final
                nao mudou, e pedir a data ali era o que fazia a intencao ficar ambigua. */}
            {ehVigencia && (
              <label className="text-sm">Prazo (nova vigência final) *
                <input
                  className="input"
                  type="date"
                  name="aditivo_nova_vigencia_fim"
                  value={campos.nova_vigencia_fim}
                  onChange={campo('nova_vigencia_fim')}
                  disabled={!contratoAceita}
                />
              </label>
            )}
            {ehVigencia && (
              <label className="text-sm">Parcelas a criar *
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  name="aditivo_qtde_parcelas"
                  value={campos.qtde_parcelas}
                  onChange={campo('qtde_parcelas')}
                  disabled={!contratoAceita}
                />
              </label>
            )}
            <label className="text-sm">Responsável
              <select
                className="input"
                name="aditivo_responsavel_id"
                value={campos.responsavel_id}
                onChange={campo('responsavel_id')}
                disabled={!contratoAceita}
              >
                <option value="">Selecione</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              {usuarios.length === 0 && (
                <span className="text-xs" style={{ color: 'var(--c-muted)' }}>
                  Nenhum usuario ativo esta vinculado a obra/centro de custo deste contrato.
                </span>
              )}
            </label>
            <label className="text-sm" style={{ gridColumn: '1 / -1' }}>Justificativa do aditivo *
              <textarea
                className="input"
                rows={3}
                name="aditivo_justificativa"
                value={campos.justificativa}
                onChange={campo('justificativa')}
                placeholder="Por que este aditivo e necessario"
                disabled={!contratoAceita}
              />
            </label>
          </div>

          <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
            O aditivo entra como pendente: o valor só é somado ao contrato quando for aprovado.
          </p>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
          <button type="button" className="btn btn-outline btn-sm" onClick={onFechar} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={enviar} disabled={!podeEnviar}>
            {enviando ? 'Enviando...' : 'Solicitar aditivo'}
          </button>
        </div>
      </div>
    </div>
  );

  // Sem `document` (SSR/teste fora do navegador) devolve nulo em vez de estourar.
  return typeof document === 'undefined' ? null : createPortal(conteudo, document.body);
}
