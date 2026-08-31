# Ownership Ativo

## Ownership ativo

Antes de trabalho paralelo, registrar agente, escopo, arquivos reservados e horario de inicio. Remover a reserva ao concluir o handoff.

### codex-data-resposta-pagamento-2026-08-31
- Escopo: separar a data operacional da solicitacao dos vencimentos das parcelas no fluxo novo de CONTRATO, padronizar o rotulo "Data Resposta/Pagamento" e concluir os ajustes operacionais da medicao (autocomplete de favorecido, datas DD/MM/AAAA, roteamento GEO, preview/download, recuperacao controlada de anexos ausentes, bloqueio de aprovacao sem arquivo, imutabilidade apos aprovacao, consulta financeira pelo credor contratual ou favorecido efetivo, busca rapida equivalente, navegacao parcela-titulo, limpeza visual da documentacao juridica, assinatura contratual por link com minuta disponivel no card e contratos visiveis com medicao bloqueada/solicitacao de retorno quando estiverem em outro setor).
- Inicio: 2026-08-31
- Arquivos reservados:
  - `frontend/src/pages/NovaSolicitacao.jsx`
  - `frontend/src/components/contratos/BlocoMedicaoContrato.jsx`
  - `frontend/src/components/DateInputBR.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/ModalMedicao.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/FinanceiroCard.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/PrevisoesContrato.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/AcoesContrato.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/PreviewAnexoModal.jsx`
  - `frontend/src/components/contratos/BlocoContratoFluxoNovo.jsx`
  - `frontend/src/utils/novaSolicitacaoCampos.js`
  - `frontend/src/pages/Solicitacoes/TabelaSolicitacoes.jsx`
  - `frontend/src/pages/Solicitacoes/index.jsx`
  - `frontend/src/pages/Solicitacoes/Filtros.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/Header.jsx`
  - `frontend/src/pages/SolicitacaoDetalhe/Timeline.jsx`
  - `backend/src/services/novaSolicitacaoCamposConfig.js`
  - `backend/src/services/contratoFluxoNovoService.js`
  - `backend/src/controllers/ContratoFluxoNovoController.js`
  - `backend/src/controllers/ContratoController.js`
  - `backend/src/controllers/SolicitacaoController.js`
  - `backend/src/controllers/AnexoController.js`
  - `backend/src/validators/operationalValidators.js`
  - `backend/src/services/medicaoContratoService.js`
  - `backend/src/services/tituloFinanceiroService.js`
  - `docs/handoffs/AJUSTES_OPERACIONAIS_MEDICAO_2026-08-31.md`
  - `docs/handoffs/RECUPERACAO_ANEXOS_MEDICAO_2026-08-31.md`
  - `docs/handoffs/FILTRO_CREDOR_PARCELAS_CONTRATO_2026-08-31.md`
  - `docs/handoffs/ASSINATURA_CONTRATO_POR_LINK_2026-08-31.md`
  - `docs/handoffs/MEDICAO_CONTRATO_FORA_SETOR_2026-08-31.md`

Ownership da sessao `codex-snapshot-sanitizado-dev-v2-2026-08-29` liberado apos configurar
`export-ignore` para QA, ambientes, uploads, artefatos locais e scripts de dados no pacote de deploy.

Ownership da sessao `codex-migrations-somente-estrutura-2026-08-29` liberado apos converter
as duas migrations novas com cadastro funcional, proteger o runner contra DML, auditar as 38
migrations exclusivas da V4 e atualizar o procedimento de transformacao.

Ownership da sessao `codex-prontidao-transformacao-dev-v2-2026-08-29` liberado apos
preservar as correcoes especificas da dev-v2, bloquear migrations no bootstrap, criar o preflight
somente leitura, compilar o frontend e registrar o handoff
`docs/handoffs/TRANSFORMACAO_DEV_V2_PARA_V4_2026-08-29.md`.

Ownership da sessao `codex-compras-oferta-saldo-mesmo-fornecedor-2026-08-29` liberado apos
integrar o delta completo do commit fonte `0a222a18`, aplicar e conferir a migration aditiva,
executar as validacoes de Compras, compilar o frontend, reiniciar o backend e registrar o handoff.

Ownership da sessao `codex-retorno-setor-principal-2026-08-29` liberado apos restringir escrita
ao setor principal, confirmar o botao de retorno no CT-0028, fechar a prestacao de recarga fora do
setor, executar build e QA somente de leitura e registrar o handoff.

Ownership da sessao `codex-pagamento-contrato-instrucional-2026-08-29` liberado apos separar
cartao corporativo de instrucoes de pagamento do contrato, validar PIX/boleto/demais formas,
executar build e QA reversivel e registrar o handoff.

Ownership da sessao `codex-previsao-ate-medicao-2026-08-28` liberado apos ajustar o ciclo
PREVISAO -> ABERTO na aprovacao da medicao, remover a duplicidade visual, desabilitar a geracao
manual para contratos novos/recarga, executar as suites reversiveis e registrar o handoff.

Ownership da sessao `codex-medicao-favorecido-obrigatorio-2026-08-28` liberado apos build,
QA reversivel de PIX, boleto e demais formas, conferencia da limpeza e registro do handoff.

Ownership da sessao `codex-medicao-aprovacao-compacta-2026-08-28` liberado apos build,
validacao visual somente de leitura e health check aprovados.

Ownership da sessao `codex-matriz-regressao-continuacao-2026-08-27` liberado apos concluir
os 227 casos, a navegacao visual das 111 rotas do menu, o build final e o handoff consolidado.

Ownership da sessao `codex-matriz-mestra-regressao-2026-08-27` liberado apos criar a matriz de
227 casos, executar o primeiro bloco visivel, registrar a escrita visual em `SOL-5136` e publicar
o handoff `docs/handoffs/MATRIZ_MESTRA_REGRESSAO_2026-08-27.md`.

Ownership da sessao `codex-auditoria-permissoes-granulares-2026-08-27` liberado apos auditoria
das 338 chaves, correcoes backend/frontend, build e provas somente de leitura.

Ownership da sessao `codex-correcao-recarga-cartao-2026-08-27` liberado apos corrigir a forma de
pagamento ausente, validar a edicao do cartao e concluir o QA transacional com rollback.

Ownership da sessao `codex-editar-cartao-recarga-2026-08-27` liberado apos tornar a edicao
explicita na tabela e concluir o build do frontend.

Ownership da sessao `codex-recarga-cartao-2026-08-27` liberado apos migration, script de dados,
build, QA transacional com rollback, conferencia da sequencia e consultas reais dos relatorios de obras.

Ownership da sessao `codex-despesa-eventual-2026-08-27` liberado apos migration, build,
QA somente de leitura/simulado e health check aprovados. Reinicio coordenado do backend e validacao
visual autenticada permanecem como proximo passo operacional.

Ownership da sessao `codex-codigo-contrato-no-tipo-2026-08-27` liberado apos integrar o numero do
contrato ao tipo, remover o card redundante, ajustar o Objeto para largura total e concluir o build.

Ownership da sessao `codex-reposicionar-titulo-vencimento-detalhe-2026-08-27` liberado apos
reposicionar Titulo e Vencimento no cabecalho da tela de detalhes e concluir o build do frontend.

Ownership da sessao `codex-retorno-solicitacao-por-setor-2026-08-27` liberado apos migration,
build, QA reversivel, conferencia da limpeza e health check aprovados. Validacao visual autenticada
permanece pendente porque o navegador interno estava na tela de login.

O ajuste de salvamento e exibicao do cadastro oficial dos itens manuais foi concluido e registrado
em `docs/handoffs/COMPRAS_CATALOGACAO_ITENS_MANUAIS_2026-08-20.md`.

Ownership da sessao `codex-formas-pagamento-nova-solicitacao-2026-08-26` liberado apos build,
validacao visual e teste reversivel de persistencia.

Ownership da sessao `codex-ocultar-trava-parcelas-2026-08-26` liberado apos build aprovado.

Ownership da sessao `codex-remover-numero-pedido-detalhe-2026-08-26` liberado apos build aprovado.

Ownership da sessao `codex-fluxo-novo-pedido-aditivo-2026-08-26` liberado apos migration e teste reversivel aprovados.

Ownership da sessao `codex-financeiro-obra-somente-leitura-2026-08-26` liberado apos build,
teste somente de leitura e health check aprovados.

Ownership da sessao `codex-remover-pagamentos-detalhe-2026-08-26` liberado apos build aprovado.

Ownership da sessao `codex-aditivo-aprovado-volta-obra-2026-08-26` liberado apos QA reversivel
e health check aprovados.

Ownership da sessao `codex-situacao-parcela-titulo-contrato-2026-08-26` liberado apos build,
QA reversivel dos tres estados e health check aprovados.

Ownership da sessao `codex-medicao-anexo-pagamento-condicional-2026-08-26` liberado apos build,
QA reversivel do pagamento/anexo, conferencia da limpeza e health check aprovados.

Ownership da sessao `codex-contrato-reenvio-evidencia-atendido-2026-08-26` liberado apos build,
QA reversivel da evidencia/status, conferencia da limpeza e health check aprovados.

Ownership da sessao `codex-contrato-juridico-status-pendente-2026-08-26` liberado apos QA reversivel,
conferencia da limpeza e health check aprovados.

Ajuste de fronteira da sessao `codex-contrato-juridico-status-pendente-2026-08-26` liberado apos
prova reversivel do valor exatamente no limite, limpeza e novo health check aprovados.

Ownership da sessao `codex-revisao-assinado-somente-origem-2026-08-26` liberado apos QA
reversivel, conferencia da limpeza e health check aprovados.

Ownership da sessao `codex-bloquear-cancelamento-geo-aguardando-assinatura-2026-08-26` liberado
apos QA reversivel, conferencia da limpeza e health check aprovados.

Ownership da sessao `codex-vencimento-boleto-conferencia-juridica-2026-08-26` liberado apos QA
reversivel, conferencia da limpeza e health check aprovados.

Ownership da sessao `codex-documentacao-juridica-abertura-contrato-2026-08-26` liberado apos
migration, build, validacao visual, QA reversivel, conferencia da limpeza e health check aprovados.

Ownership da sessao `codex-qualificacao-conjuge-contrato-2026-08-27` liberado apos build,
validacao visual, QA reversivel, conferencia da limpeza e health check aprovados.
