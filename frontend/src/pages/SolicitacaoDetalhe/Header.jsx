import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { corrigirTextoCorrompido } from '../../utils/texto';
import { formatarDataLocalPtBr } from '../../utils/dateLocal';
import { getTipoSolicitacaoBehavior } from '../../utils/tipoSolicitacao';
import { formaPagamentoEhPix } from '../../utils/formaPagamento';

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

/**
 * Um ladrilho do cabecalho, agora com LARGURA PROPRIA (nova organizacao, 23/08).
 *
 * `span` e quantas das 4 colunas o ladrilho ocupa. Vai como propriedade do ladrilho, e nao como
 * regra de CSS por posicao (`:nth-child`), porque metade destes campos so aparece quando ha
 * contrato — uma regra por posicao se desalinha sozinha na primeira solicitacao de compra.
 */
function InfoItem({ label, value, span = 1, fullWidth = false }) {
  return (
    <div
      className={`sol-detail-stat${fullWidth ? ' sol-detail-stat--full' : ''}`}
      style={!fullWidth && span > 1 ? { gridColumn: `span ${span}` } : undefined}
    >
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

function limparDescricaoCompra(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return texto;
  if (normalizarTexto(texto).includes('SOLICITACAO DE COMPRA')) {
    return texto
      .replace(/\s+(Itens|Items):[\s\S]*$/i, '')
      .replace(/\s+-\s*$/g, '')
      .trim() || 'Solicitacao de compra';
  }
  if (!texto || !/solicita[cç][aã]o de compra/i.test(texto)) return texto;
  return texto
    .replace(/\s+(Itens|Items):[\s\S]*$/i, '')
    .replace(/\s+-\s*$/g, '')
    .trim() || 'Solicitacao de compra';
}

export default function Header({
  solicitacao,
  // PI-16: o contrato do fluxo novo vive nesta solicitacao. O FAVORECIDO e a CHAVE PIX vem dele,
  // nao da solicitacao — quem recebe o pagamento pode ser um terceiro (PI-12).
  contratoDoFluxo = null,
  onAlterarStatus,
  onEnviarSetor,
  mostrarAlterarStatus = true,
  mostrarEnviarSetor = true,
  podeEditarRefContrato = false,
  mostrarContratoInfo = true,
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
  const numeroContratoCabecalho = String(codigoContratoAtual || '')
    .trim()
    .replace(/^CT-\s*/i, '');
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
  const comportamentoTipo = getTipoSolicitacaoBehavior(solicitacao?.tipo);
  const subtipoSolicitacao = solicitacao?.tipoSubSolicitacao?.nome || '';
  // O SUBTIPO SO APARECE QUANDO EXISTE (24/08).
  //
  // O item 1 tirou o subtipo do fluxo de contratos — o proprio tipo CONTRATO passou a disparar o
  // fluxo. Mas o ladrilho continuava aparecendo com um travessao, porque `mostrar_subtipo` do TIPO
  // seguia ligado: todo contrato novo exibia "Subtipo: -".
  //
  // E a mesma regra ja aplicada a Objeto, Contratado, Responsavel e ao periodo da medicao: ladrilho
  // vazio e ruido que a pessoa aprende a ignorar, e ai para de ler os que importam.
  //
  // Contrato ANTIGO, aberto quando o subtipo existia, continua mostrando o dele — o valor esta la.
  const exibirSubtipo = Boolean(subtipoSolicitacao);
  const ultimoHistoricoStatus = [...historicos]
    .filter(item => item?.acao === 'STATUS_ALTERADO')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const setorStatusAtual = ultimoHistoricoStatus?.setor || solicitacao?.area_responsavel || null;
  const descricaoCorrigida = limparDescricaoCompra(corrigirTextoCorrompido(solicitacao?.descricao || ''));
  const chavePixContrato = String(
    solicitacao?.favorecido_chave_pix
      || (formaPagamentoEhPix(solicitacao?.formaPagamento) ? contratoDoFluxo?.favorecido?.chave : '')
      || ''
  ).trim();


  // OBJETO, CONTRATADO e RESPONSAVEL existiam no banco e nunca chegavam a tela (esboco do cliente,
  // 23/08). Os tres sao do CONTRATO: numa solicitacao de compra ou reembolso nao ha o que mostrar,
  // e eles ficam OCULTOS em vez de aparecerem com um travessao — ladrilho vazio e ruido que a
  // pessoa aprende a ignorar, e ai para de ler os que importam.
  const contratados = Array.isArray(contratoDoFluxo?.contratados) ? contratoDoFluxo.contratados : [];
  const rotuloContratado = contratados
    // Separador ` · `, o mesmo que o resto do cabecalho usa para lista: dois formatos para a mesma
    // ideia fariam a tela parecer inconsistente sem motivo. PI-12: os contratados podem ser varios.
    //
    // Razao social com o NOME FANTASIA entre parenteses quando houver: o papel identifica a empresa
    // pela razao social, mas quem trabalha na obra a conhece pelo nome de fachada.
    .map((c) => {
      const identificacao = c.nome_fantasia ? `${c.nome} (${c.nome_fantasia})` : c.nome;
      return c.cpf_cnpj ? `${identificacao} — ${c.cpf_cnpj}` : identificacao;
    })
    .join(' · ');

  return (
    <div className="sol-detail-header">
      <div className="sol-detail-header-main">
        <div className="sol-detail-title-wrap">
          <span className="sol-detail-code-chip">{solicitacao.codigo || '-'}</span>
          <h1 className="sol-detail-type">
            {solicitacao.tipo?.nome || '-'}
            {contratoDoFluxo && numeroContratoCabecalho && numeroContratoCabecalho !== '-'
              ? ` - ${numeroContratoCabecalho}`
              : ''}
          </h1>
          {contratoDoFluxo?.fluxo_novo && String(refContratoAtual || '').trim() !== '-' && (
            <p className="sol-detail-title-text">{refContratoAtual}</p>
          )}
          {/* A descricao so aparece quando DIZ outra coisa que o titulo. No fluxo novo o titulo fica
              logo abaixo do tipo, sem um segundo card na grade. Se a descricao trouxer informacao
              adicional, ela continua disponivel como texto de apoio. */}
          {/* Comparacao com `trim`: a descricao passa por `corrigirTextoCorrompido` e a ref vem crua
              do banco — a do CT-0005 tem espaco no fim. Sem normalizar, "Teste" e "Teste  " seriam
              textos diferentes e a repeticao continuaria na tela. */}
          {String(descricaoCorrigida || '').trim() !== String(refContratoAtual || '').trim() && (
            <p className="sol-detail-description">{descricaoCorrigida || 'Sem descricao informada.'}</p>
          )}
        </div>

        <div className="sol-detail-header-side">
          <div className="sol-detail-actions">
            {mostrarAlterarStatus && (
              <button onClick={onAlterarStatus} className="btn btn-outline sol-detail-action-btn" type="button">
                Alterar status
              </button>
            )}
            <StatusBadge status={solicitacao.status_global} setor={setorStatusAtual} />
            {mostrarEnviarSetor && (
              <button onClick={onEnviarSetor} className="btn btn-outline sol-detail-action-btn" type="button">
                Enviar para outro setor
              </button>
            )}
          </div>
          <div className="sol-detail-header-date">
            <span className="sol-detail-header-date-label">Data Resposta/Pagamento</span>
            <strong className="sol-detail-header-date-value">{formatarData(solicitacao.data_vencimento)}</strong>
          </div>
        </div>
      </div>

      {/* UM bloco so, de 4 colunas, com cada ladrilho declarando a largura que precisa.
          Eram dois grids de larguras fixas, e por isso "Obra" e "Objeto" — os textos mais longos —
          ficavam na mesma medida de "Setor".

          A ordem e a do esboco: identidade e partes primeiro (que contrato e este, o que se
          contrata, com quem, quem responde), depois datas e valores. */}
      <div className="sol-detail-stats-grid">
        {/* Solicitacoes que apenas referenciam um contrato preservam o card. No tipo CONTRATO, o
            numero ja compoe o titulo do cabecalho e nao deve ser repetido na grade. */}
        {mostrarContratoInfo && !contratoDoFluxo && (
          <InfoItem label="Contrato" value={codigoContratoAtual} span={2} />
        )}

        {contratoDoFluxo?.objeto && (
          <InfoItem label="Objeto" value={contratoDoFluxo.objeto} fullWidth />
        )}
        {/* No fluxo novo o Titulo agora faz parte da identidade do cabecalho. Contratos legados
            preservam a antiga Ref. do contrato na grade, pois esse dado nao representa um titulo. */}
        {mostrarContratoInfo && !contratoDoFluxo?.fluxo_novo && (
          <InfoItem
            label="Ref. do contrato"
            value={refContratoAtual}
            span={2}
          />
        )}


        {/* Uma coluna com um contratado, duas com varios: e a linha que o esboco desenha
            (Contratado · Responsavel · Setor · Criado em), e uma lista de nomes nao cabe em um
            quarto da largura. */}
        {contratados.length > 0 && (
          <InfoItem label="Contratado" value={rotuloContratado} span={contratados.length > 1 ? 2 : 1} />
        )}
        {!contratoDoFluxo && solicitacao.parceiro && (
          <InfoItem
            label="Fornecedor / Credor"
            value={solicitacao.parceiro.cpf_cnpj
              ? `${solicitacao.parceiro.nome} — ${solicitacao.parceiro.cpf_cnpj}`
              : solicitacao.parceiro.nome}
            span={2}
          />
        )}
        {!contratoDoFluxo && solicitacao.favorecido && (
          <InfoItem
            label="Favorecido"
            value={solicitacao.favorecido.cpf_cnpj
              ? `${solicitacao.favorecido.nome} — ${solicitacao.favorecido.cpf_cnpj}`
              : solicitacao.favorecido.nome}
            span={2}
          />
        )}
        {!contratoDoFluxo && solicitacao.formaPagamento?.nome && (
          <InfoItem label="Forma de pagamento" value={solicitacao.formaPagamento.nome} span={2} />
        )}
        {!contratoDoFluxo && solicitacao.favorecido_chave_pix && (
          <InfoItem label="Chave PIX informada" value={solicitacao.favorecido_chave_pix} span={2} />
        )}
        {contratoDoFluxo?.responsavel?.nome && (
          <InfoItem label="Responsavel" value={contratoDoFluxo.responsavel.nome} />
        )}
        <InfoItem label="Setor" value={solicitacao.area_responsavel || '-'} />
        <InfoItem label="Criado em" value={formatarDataHora(solicitacao.createdAt)} />

        <InfoItem label="Valor" value={formatarValor(solicitacao.valor)} />
        {!contratoDoFluxo && solicitacao.justificativa && (
          <InfoItem label="Justificativa" value={solicitacao.justificativa} span={4} />
        )}
        {solicitacao.data_demissao && <InfoItem label="Data de demissao" value={formatarData(solicitacao.data_demissao)} />}
        {/* O periodo da medicao so aparece quando EXISTE — mesma regra ja aplicada a Objeto,
            Contratado e Responsavel logo acima: ladrilho vazio e ruido que a pessoa aprende a
            ignorar, e ai para de ler os que importam.
            Antes eles apareciam com travessao em toda solicitacao, e o buraco passava despercebido
            porque o ladrilho "Status" fechava a linha. Com o Status fora (item 10), dois campos
            vazios passariam a desalinhar tudo o que vem depois. */}
        {(solicitacao.data_inicio_medicao || solicitacao.data_fim_medicao) && (
          <>
            <InfoItem label="Inicio da medicao" value={formatarData(solicitacao.data_inicio_medicao)} />
            <InfoItem label="Fim da medicao" value={formatarData(solicitacao.data_fim_medicao)} />
          </>
        )}
        {/* ITEM 10 (23/08): o ladrilho "Status" saiu. Era `solicitacao.status_global` — a MESMA
            variavel que alimenta o `StatusBadge` da barra de acoes, a poucos centimetros daqui. O
            badge fica sendo o unico lugar onde o status aparece. */}

        {/* O Vencimento foi levado para o cabecalho, junto do status, sem duplicar a informacao. */}
        <InfoItem label="Obra" value={solicitacao.obra?.nome || '-'} span={2} />

        {/* ITEM 16 (23/08): o ladrilho "Apropriacao" saiu daqui. A mesma informacao aparecia em
            TRES lugares — este, o card "Apropriacoes do contrato" e um bloco dentro do card
            Financeiro (esse ultimo saiu pelo item 17). O card de baixo fica: e o unico dos tres que
            tambem EDITA o rateio. */}

        {exibirSubtipo && <InfoItem label="Subtipo" value={subtipoSolicitacao} span={2} />}

        {/* Quem recebe o pagamento e a chave para pagar. A chave segue a ordem definida pelo
            cliente (19/08): fixa 1, senao fixa 2, senao a variavel — a escolha e feita no backend,
            para a tela nao ter uma segunda versao da mesma regra. */}
        {contratoDoFluxo?.favorecido && (
          <InfoItem
            label="Favorecido"
            span={2}
            value={contratoDoFluxo.favorecido.cpf_cnpj
              ? `${contratoDoFluxo.favorecido.nome} — ${contratoDoFluxo.favorecido.cpf_cnpj}`
              : contratoDoFluxo.favorecido.nome}
          />
        )}
        {contratoDoFluxo?.favorecido && chavePixContrato && (
          <InfoItem
            label="Chave PIX"
            span={2}
            value={`${chavePixContrato}${!solicitacao?.favorecido_chave_pix && contratoDoFluxo.favorecido.tipo
              ? ` (${contratoDoFluxo.favorecido.tipo})`
              : ''}`}
          />
        )}
      </div>

      {mostrarContratoInfo && podeEditarRefContrato && (
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
