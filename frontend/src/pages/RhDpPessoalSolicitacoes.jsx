import { useCallback, useEffect, useMemo, useState } from 'react';
import { TabelaPadrao } from '../components/padrao';
import OverlayModal from '../components/ui/OverlayModal';
import {
  anexarNaRhSolicitacao,
  aprovarRhSolicitacao,
  cancelarRhSolicitacao,
  conferirDocumentacaoRhSolicitacao,
  listarAnexosRhSolicitacao,
  listarRhSolicitacoes,
  reenviarRhSolicitacao,
  rejeitarRhSolicitacao,
  validarAnexoRhSolicitacao,
  getRhDocumentoTiposParaAnexo
,
  enviarRhSolicitacao} from '../services/rhDp';

/**
 * A ABA DE SOLICITACOES — acompanhar e decidir (26/08).
 *
 * Separada da aba de colaboradores porque as duas respondem perguntas diferentes: aquela e "quem
 * trabalha aqui e o que eu faco com essa pessoa"; esta e "o que esta esperando decisao".
 *
 * A validacao de documento vive AQUI, e nao na aba de colaboradores, porque ela e uma etapa do
 * pedido: o DP atesta que o documento e valido ANTES de ele virar documento do colaborador. Depois
 * que vira, ele aparece na pasta e some daqui — que e o comportamento certo, porque a decisao ja
 * foi tomada.
 */

const ROTULO_TIPO = {
  ADMISSAO: 'Admissao',
  DEMISSAO: 'Demissao',
  MOVIMENTACAO: 'Movimentacao',
  PAGAMENTO_MAO_DE_OBRA: 'Pagamento de mao de obra',
  // Legado: existe gravado ate `migrarTrocaObraParaMovimentacao.js` rodar em producao.
  TROCA_OBRA: 'Troca de obra',
  EVENTO_RECORRENTE: 'Evento recorrente',
  ALTERACAO_SALARIAL: 'Alteracao salarial'
};

const ROTULO_SITUACAO = {
  ABERTA: 'Aguardando decisao',
  APROVADA: 'Aprovada',
  REJEITADA: 'Devolvida para correcao',
  CANCELADA: 'Cancelada'
};

// Ver o comentario em RhDpPessoal.jsx: sem `columns` + `columnKey`, as colunas colapsam.
function chipDoTipo(tipo) {
  if (tipo === 'ALTERACAO_SALARIAL') return 'rh-chip rh-chip--diretoria';
  if (tipo === 'EVENTO_RECORRENTE') return 'rh-chip rh-chip--evento';
  return 'rh-chip rh-chip--pedido';
}

function chipDaSituacao(situacao) {
  if (situacao === 'RASCUNHO') return 'rh-chip rh-chip--rascunho';
  if (situacao === 'ABERTA') return 'rh-chip rh-chip--aberta';
  if (situacao === 'REJEITADA') return 'rh-chip rh-chip--devolvida';
  if (situacao === 'APROVADA') return 'rh-chip rh-chip--evento';
  return 'rh-chip';
}

export default function RhDpPessoalSolicitacoes({ podeAbrir, podeDecidir, podeAprovarSalario, aoMudar }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [filtroSituacao, setFiltroSituacao] = useState('ABERTA');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [aberta, setAberta] = useState(null);
  const [anexos, setAnexos] = useState([]);
  const [conferencia, setConferencia] = useState(null);
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [envio, setEnvio] = useState({ tipo: '', arquivo: null, enviando: false });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const lista = await listarRhSolicitacoes({
        situacao: filtroSituacao || undefined,
        tipo: filtroTipo || undefined
      });
      setSolicitacoes(Array.isArray(lista) ? lista : []);
    } catch (error) {
      setErro(error.message || 'Nao foi possivel carregar as solicitacoes.');
    } finally {
      setCarregando(false);
    }
  }, [filtroSituacao, filtroTipo]);

  useEffect(() => { carregar(); }, [carregar]);

  const contagem = useMemo(() => {
    const porTipo = {};
    solicitacoes.forEach((s) => { porTipo[s.tipo] = (porTipo[s.tipo] || 0) + 1; });
    return porTipo;
  }, [solicitacoes]);

  async function abrirDetalhe(solicitacao) {
    setErro('');
    setAberta(solicitacao);
    setAnexos([]);
    setConferencia(null);
    try {
      const [listaAnexos, conferido] = await Promise.all([
        listarAnexosRhSolicitacao(solicitacao.id),
        conferirDocumentacaoRhSolicitacao(solicitacao.id)
      ]);
      setAnexos(Array.isArray(listaAnexos) ? listaAnexos : []);
      setConferencia(conferido);
      if (!tiposDocumento.length) {
        const tipos = await getRhDocumentoTiposParaAnexo();
        setTiposDocumento(Array.isArray(tipos) ? tipos : []);
      }
    } catch (error) {
      setErro(error.message || 'Nao foi possivel abrir a solicitacao.');
    }
  }

  async function decidirAnexo(anexo, aceito) {
    setErro('');
    setAviso('');
    try {
      if (!aceito) {
        // eslint-disable-next-line no-alert
        const motivo = window.prompt(
          `Por que "${anexo.nome_original}" nao foi aceito? A obra precisa saber o que reenviar.`
        );
        if (!motivo || !motivo.trim()) return;
        await validarAnexoRhSolicitacao(aberta.id, anexo.id, { aceito: false, motivo: motivo.trim() });
        setAviso('Documento recusado. A obra ve o motivo e pode reenviar.');
      } else {
        // eslint-disable-next-line no-alert
        const observacao = window.prompt(
          `Atestar que "${anexo.nome_original}" e valido e util.\n\nObservacao (opcional):`,
          'Confere com o original.'
        );
        if (observacao === null) return;
        await validarAnexoRhSolicitacao(aberta.id, anexo.id, { aceito: true, observacao });
        setAviso('Documento atestado. Ele vai para a pasta quando a solicitacao for aprovada.');
      }
      await abrirDetalhe(aberta);
    } catch (error) {
      setErro(error.message || 'Nao foi possivel registrar a conferencia do documento.');
    }
  }

  async function enviarDocumento(evento) {
    evento.preventDefault();
    setErro('');
    setAviso('');

    if (!envio.arquivo) {
      setErro('Escolha o arquivo antes de enviar.');
      return;
    }

    setEnvio((atual) => ({ ...atual, enviando: true }));
    try {
      await anexarNaRhSolicitacao(
        aberta.id,
        { documento_tipo_id: envio.tipo || undefined },
        envio.arquivo
      );
      setAviso('Documento enviado. Ele vai para a pasta depois que o DP atestar.');
      setEnvio({ tipo: '', arquivo: null, enviando: false });
      await abrirDetalhe(aberta);
    } catch (error) {
      setErro(error.message || 'Nao foi possivel enviar o documento.');
      setEnvio((atual) => ({ ...atual, enviando: false }));
    }
  }

  /**
   * RASCUNHO -> ABERTA. E aqui que o DP finalmente recebe o pedido.
   *
   * O erro mais util deste fluxo vem do servidor: quando faltam documentos obrigatorios ele responde
   * com a LISTA do que falta. Mostrar a mensagem crua e melhor do que traduzi-la para um
   * "verifique os documentos" generico, que obrigaria a pessoa a caçar o que e.
   */
  async function enviarAoDp(solicitacao) {
    setErro('');
    setAviso('');
    try {
      await enviarRhSolicitacao(solicitacao.id);
      setAviso(`Solicitacao #${solicitacao.id} enviada. O Departamento Pessoal ja pode decidir.`);
      await carregar();
    } catch (error) {
      setErro(error.message || 'Nao foi possivel enviar a solicitacao.');
    }
  }

  async function decidir(solicitacao, acao) {
    setErro('');
    setAviso('');
    try {
      if (acao === 'aprovar') {
        /**
         * A conferencia AVISA, NAO TRAVA — mas agora ela avisa duas coisas diferentes: o que nunca
         * chegou, e o que chegou e ainda nao foi atestado. A segunda importa mais: aprovar com
         * documento pendente significa que ele NAO vai para a pasta, e quem aprova precisa saber
         * disso antes, nao depois.
         */
        const conferido = await conferirDocumentacaoRhSolicitacao(solicitacao.id);
        const partes = [];
        if (conferido?.faltando?.length) {
          partes.push(`Nunca chegaram: ${conferido.faltando.map((d) => d.nome).join(', ')}`);
        }
        if (conferido?.anexosAguardando) {
          partes.push(
            `${conferido.anexosAguardando} documento(s) aguardando sua conferencia — eles NAO vao `
            + 'para a pasta do colaborador se voce aprovar agora.'
          );
        }
        if (partes.length) {
          // eslint-disable-next-line no-alert
          if (!window.confirm(`${partes.join('\n\n')}\n\nAprovar mesmo assim?`)) return;
        }
        await aprovarRhSolicitacao(solicitacao.id);
        setAviso('Solicitacao aprovada.');
      }

      if (acao === 'devolver') {
        // eslint-disable-next-line no-alert
        const motivo = window.prompt('Por que esta sendo devolvida? Quem pediu precisa saber o que corrigir.');
        if (!motivo || !motivo.trim()) return;
        await rejeitarRhSolicitacao(solicitacao.id, motivo.trim());
        setAviso('Solicitacao devolvida a quem abriu.');
      }

      if (acao === 'reenviar') {
        await reenviarRhSolicitacao(solicitacao.id, {});
        setAviso('Solicitacao reenviada ao Departamento Pessoal.');
      }

      if (acao === 'cancelar') {
        // eslint-disable-next-line no-alert
        const motivo = window.prompt('Motivo do cancelamento (opcional):') || '';
        await cancelarRhSolicitacao(solicitacao.id, motivo);
        setAviso('Solicitacao cancelada.');
      }

      setAberta(null);
      await carregar();
      if (typeof aoMudar === 'function') aoMudar();
    } catch (error) {
      setErro(error.message || 'Nao foi possivel concluir a acao.');
    }
  }

  return (
    <div className="space-y-4">
      {erro ? <div className="alert alert-danger">{erro}</div> : null}
      {aviso ? <div className="alert alert-success">{aviso}</div> : null}

      <div className="rh-pessoal-alertas">
        <div className="rh-pessoal-alerta">
          <div className="rh-pessoal-alerta-numero">{solicitacoes.length}</div>
          <div className="rh-pessoal-alerta-texto">
            {filtroSituacao ? ROTULO_SITUACAO[filtroSituacao].toLowerCase() : 'no filtro atual'}
          </div>
        </div>
        {Object.entries(contagem).map(([tipo, qtd]) => (
          <div className="rh-pessoal-alerta" key={tipo}>
            <div className="rh-pessoal-alerta-numero">{qtd}</div>
            <div className="rh-pessoal-alerta-texto">{ROTULO_TIPO[tipo] || tipo}</div>
          </div>
        ))}
      </div>

      <div className="sol-surface-card app-toolbar-card rounded-xl p-3 md:p-4">
        <div className="rh-colaboradores-filter-grid">
          <label className="form-field">
          <span className="form-label">Situacao</span>
          <select className="form-control" value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}>
            {/* RASCUNHO na lista: um estado que a tela nao sabe filtrar e um estado que ninguem
                encontra — e rascunho esquecido e justamente o que precisa ser encontrado. */}
            <option value="RASCUNHO">Rascunhos (faltam enviar)</option>
            <option value="ABERTA">Aguardando decisao</option>
            <option value="REJEITADA">Devolvidas para correcao</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="CANCELADA">Canceladas</option>
            <option value="">Todas</option>
          </select>
          </label>

          <label className="form-field">
            <span className="form-label">Tipo</span>
            <select className="form-control" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(ROTULO_TIPO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-outline" onClick={carregar} disabled={carregando}>
            {carregando ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      <div className="card sol-surface-card">
        <TabelaPadrao
          colunas={[
            {
              id: 'tipo',
              titulo: 'Tipo',
              tipo: 'badge',
              render: (s) => (
                <span className={chipDoTipo(s.tipo)}>
                  {/*
                    Sem obra de origem, o pedido de TROCA_OBRA e a PRIMEIRA lotacao — e "trocar"
                    seria a palavra errada. Quem decide precisa entender o que esta decidindo.
                  */}
                  {(s.tipo === 'TROCA_OBRA' || s.subtipo === 'TRANSFERENCIA_OBRA') && !s.colaborador?.obra_id
                    ? 'Vincular a obra'
                    : ROTULO_TIPO[s.tipo] || s.tipo}
                </span>
              )
            },
            {
              id: 'colaborador',
              titulo: 'Colaborador',
              // R17: a solicitacao e sobre uma PESSOA — o nome dela identifica a linha.
              tipo: 'identidade',
              noCard: 'titulo',
              /* Na admissao o colaborador ainda nao existe: o nome vive no pedido. */
              render: (s) => s.colaborador?.nome || s.dados_json?.nome || <span className="opacity-60">a admitir</span>
            },
            {
              id: 'obra',
              titulo: 'Obra',
              tipo: 'texto',
              /*
                Na TROCA DE OBRA a linha mostra ORIGEM e DESTINO. Sem isso, quem decide ve so
                uma obra e nao sabe se e de onde ele sai ou para onde vai — e a decisao e
                justamente sobre esse movimento.
              */
              render: (s) => (s.tipo === 'TROCA_OBRA' ? (
                <div className="rh-troca-obra">
                  <span className="rh-troca-obra-origem">
                    {s.obra?.nome || s.colaborador?.obra?.nome || 'Sem obra'}
                  </span>
                  <span className="rh-troca-obra-seta" aria-hidden="true">→</span>
                  <span className="rh-troca-obra-destino">
                    {s.obra_destino_nome || '—'}
                  </span>
                </div>
              ) : (
                s.obra?.nome || '—'
              ))
            },
            {
              id: 'situacao',
              titulo: 'Situacao',
              tipo: 'status',
              render: (s) => (
                <>
                  <span className={chipDaSituacao(s.situacao)}>{ROTULO_SITUACAO[s.situacao] || s.situacao}</span>
                  {s.motivo_rejeicao ? (
                    <div className="text-xs rh-pessoal-devolucao">{s.motivo_rejeicao}</div>
                  ) : null}
                </>
              )
            },
            {
              id: 'aberta',
              titulo: 'Aberta em',
              tipo: 'data',
              render: (s) => (s.createdAt ? new Date(s.createdAt).toLocaleDateString('pt-BR') : '—')
            }
          ]}
          itens={solicitacoes}
          storageKey="tabela:rh-dp-pessoal-solicitacoes"
          rotuloRolagem="Solicitacoes RH/DP"
          carregando={carregando}
          vazio="Nenhuma solicitacao neste filtro."
          // Rascunho e aberta ainda esperam alguem: a linha fica marcada.
          urgencia={(s) => (['RASCUNHO', 'ABERTA'].includes(s.situacao) ? 'warning' : null)}
          acoesLinha={(s) => (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => abrirDetalhe(s)}>
                Abrir
              </button>
              {podeDecidir && s.situacao === 'ABERTA' ? (
                <>
                  {s.tipo !== 'ALTERACAO_SALARIAL' || podeAprovarSalario ? (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => decidir(s, 'aprovar')}>
                      Aprovar
                    </button>
                  ) : (
                    <span className="text-xs opacity-70">Aguardando a Diretoria</span>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => decidir(s, 'devolver')}>
                    Devolver
                  </button>
                </>
              ) : null}
              {podeAbrir && s.situacao === 'RASCUNHO' ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => enviarAoDp(s)}>
                  Enviar
                </button>
              ) : null}
              {podeAbrir && s.situacao === 'REJEITADA' ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => decidir(s, 'reenviar')}>
                  Reenviar
                </button>
              ) : null}
              {podeAbrir && ['RASCUNHO', 'ABERTA'].includes(s.situacao) ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => decidir(s, 'cancelar')}>
                  Cancelar
                </button>
              ) : null}
            </>
          )}
          larguraAcoes={300}
        />
      </div>

      {/*
        MODAL, e nao card no fim da pagina.
        O card abria ABAIXO da tabela — quem clicava em "Abrir" nao via nada acontecer sem rolar a
        tela, e concluia que o sistema tinha ignorado o clique. Mesmo defeito que ja tinha sido
        corrigido na aba de colaboradores; este aqui passou batido.
      */}
      {aberta ? (
        <OverlayModal
          rotulo={`${ROTULO_TIPO[aberta.tipo] || aberta.tipo} #${aberta.id}`}
          largura="900px"
          onFechar={() => setAberta(null)}
        >
        <div className="rh-modal-conteudo space-y-4">
          <div className="app-page-header-row">
            <div>
              <h2 className="text-lg font-semibold">
                {ROTULO_TIPO[aberta.tipo] || aberta.tipo} · #{aberta.id}
              </h2>
              <p className="page-subtitle">
                {aberta.colaborador?.nome || aberta.dados_json?.nome || 'Colaborador a admitir'}
                {aberta.justificativa ? ` — ${aberta.justificativa}` : ''}
              </p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAberta(null)}>Fechar</button>
          </div>

          {conferencia?.exigeConferencia ? (
            <div className="rh-pessoal-conferencia">
              <div>
                <strong>Atestados:</strong>{' '}
                {conferencia.entregues.length
                  ? conferencia.entregues.map((d) => d.nome).join(', ')
                  : <span className="opacity-70">nenhum ainda</span>}
              </div>
              {conferencia.aguardandoValidacao?.length ? (
                <div className="rh-pessoal-conferencia--aguarda">
                  <strong>Aguardando sua conferencia:</strong>{' '}
                  {conferencia.aguardandoValidacao.map((d) => d.nome).join(', ')}
                </div>
              ) : null}
              {conferencia.faltando.length ? (
                <div className="rh-pessoal-conferencia--falta">
                  <strong>Nunca chegaram:</strong> {conferencia.faltando.map((d) => d.nome).join(', ')}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* A obra envia enquanto o pedido esta ABERTO ou foi devolvido — depois de decidido, nao. */}
          {podeAbrir && ['RASCUNHO', 'ABERTA', 'REJEITADA'].includes(aberta.situacao) ? (
            <form onSubmit={enviarDocumento} className="rh-pessoal-envio">
              <label className="form-field">
                <span className="form-label">Tipo do documento</span>
                <select
                  className="form-control"
                  value={envio.tipo}
                  onChange={(e) => setEnvio({ ...envio, tipo: e.target.value })}
                >
                  {/*
                    Aqui a primeira opcao NAO e rotulo: ela e uma escolha valida, e diz a
                    CONSEQUENCIA dela — anexo sem tipo nao entra na pasta do colaborador.
                    Trocar por "Selecione" apagaria a unica pista disso na tela.
                  */}
                  <option value="">Sem classificacao (nao entra na pasta)</option>
                  {tiposDocumento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}{tipo.obrigatorio ? ' (obrigatorio)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Arquivo</span>
                <input
                  type="file"
                  className="form-control"
                  onChange={(e) => setEnvio({ ...envio, arquivo: e.target.files?.[0] || null })}
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={envio.enviando}>
                {envio.enviando ? 'Enviando...' : 'Enviar documento'}
              </button>
            </form>
          ) : null}

          <div>
            <h3 className="font-semibold mb-2">Documentos enviados pela obra</h3>
            {anexos.length === 0 ? (
              <p className="opacity-70">Nenhum documento anexado a esta solicitacao.</p>
            ) : (
              <ul className="rh-pessoal-pedidos">
                {anexos.map((anexo) => (
                  <li key={anexo.id} className="rh-pessoal-pedido">
                    <div>
                      <div className="font-medium">{anexo.nome_original}</div>
                      <div className="text-xs opacity-70">
                        {anexo.tipo?.nome || 'Sem classificacao'}
                        {anexo.documento_gerado_id ? ' · ja esta na pasta do colaborador' : ''}
                      </div>
                      {anexo.motivo_recusa ? (
                        <div className="text-sm rh-pessoal-devolucao">Recusado: {anexo.motivo_recusa}</div>
                      ) : null}
                      {anexo.observacao_validacao ? (
                        <div className="text-sm opacity-80">Conferencia: {anexo.observacao_validacao}</div>
                      ) : null}
                    </div>
                    <div className="app-page-actions">
                      <span className={
                        anexo.situacao === 'VALIDADO' ? 'rh-chip rh-chip--evento'
                          : anexo.situacao === 'RECUSADO' ? 'rh-chip rh-chip--devolvida'
                            : 'rh-chip rh-chip--aberta'
                      }
                      >
                        {anexo.situacao}
                      </span>
                      {/* Depois que virou documento, atestar de novo nao significa nada. */}
                      {podeDecidir && anexo.situacao !== 'VALIDADO' && !anexo.documento_gerado_id ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => decidirAnexo(anexo, true)}>
                          Atestar
                        </button>
                      ) : null}
                      {podeDecidir && anexo.situacao !== 'RECUSADO' && !anexo.documento_gerado_id ? (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => decidirAnexo(anexo, false)}>
                          Recusar
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {aberta.historicos?.length ? (
            <div>
              <h3 className="font-semibold mb-2">Historico</h3>
              <ul className="rh-pessoal-historico">
                {aberta.historicos.map((h) => (
                  <li key={h.id}>
                    <span className="opacity-70">{h.setor || '—'}</span> · {h.acao} · {h.descricao}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        </OverlayModal>
      ) : null}
    </div>
  );
}
