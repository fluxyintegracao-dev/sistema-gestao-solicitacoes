# Exclusao logica, rastreabilidade e notificacoes

## Decisao de produto

Quando o usuario acionar uma acao chamada **Excluir**, o texto do botao deve permanecer como esta na interface. Para o usuario, a intencao operacional continua sendo excluir/remover aquele registro da visao de trabalho.

Na camada tecnica, porem, nenhum registro de negocio deve ser apagado fisicamente do banco apenas por uma acao de tela. A acao deve transformar o registro em invisivel, inativo, cancelado, arquivado ou estornado, conforme o contexto.

Essa regra existe para preservar rastreabilidade, evitar quebra de chaves estrangeiras, permitir auditoria e reduzir risco de perda de informacao operacional.

## Diferenca entre a linguagem da tela e a regra tecnica

- **Excluir**: mantem o nome atual na UI, mas tecnicamente executa exclusao logica e remove o registro da listagem padrao.
- **Inativar**: mantem o registro visivel em telas administrativas que permitam reativacao.
- **Arquivar**: remove da fila operacional, mas preserva consulta historica.
- **Cancelar**: registra encerramento de um evento de negocio que nao deve seguir o fluxo.
- **Estornar**: desfaz efeito financeiro/operacional ja efetivado, mantendo trilha.

## Regra geral

1. Cadastros com campo `ativo` devem receber `ativo = false`.
2. Solicitacoes devem receber `cancelada = true` e permanecer com historico, anexos, comprovantes, notificacoes e vinculos preservados.
3. Contratos devem receber `ativo = false`, mantendo anexos, credores, apropriacoes e vinculos.
4. Registros financeiros, bancarios, pedidos, cotacoes e apuracoes devem usar status de negocio (`CANCELADO`, `ESTORNADO`, `INATIVO`, `ARQUIVADO`) em vez de remocao fisica.
5. Registros de historico, auditoria e eventos nao devem ser apagados por acao do usuario.
6. Exclusao fisica fica restrita a caches tecnicos, logs expirados, arquivos temporarios e rotinas internas sem valor operacional.

## Inventario inicial de pontos com exclusao real

### Primeiro lote implantado

- `SolicitacaoController.excluir`: marca `cancelada = true`, preservando historico, anexos, comprovantes, notificacoes, titulos e demais vinculos.
- `ContratoController.excluir`: marca `ativo = false`, preservando anexos, credores, apropriacoes e vinculos com solicitacoes.
- `TipoSolicitacaoController.excluir`: marca `ativo = false`, preservando subtipos, solicitacoes e contratos vinculados.
- `TipoSubContratoController.excluir`: marca `ativo = false`, preservando solicitacoes e contratos vinculados.
- `CategoriaController.destroy`: marca `ativo = false`.
- `UnidadeController.destroy`: marca `ativo = false`.
- `InsumoController.destroy`: marca `ativo = false`.
- `CrmPipelineController.deleteStage`: marca a etapa do funil como `ativo = false`.
- `CrmAdminController.excluirCanal`: marca `deleted_at` em `crm_channels`, preservando diferenca entre excluir e inativar.
- `CrmAdminController.excluirNumero`: marca `deleted_at` em `crm_phone_assets`, preservando diferenca entre excluir e inativar.
- `AnexoController.remover`: marca `deleted_at` em `anexos` e registra evento `ANEXO_REMOVIDO`.
- `ComprovanteController.remover`: marca `deleted_at` em `comprovantes`, preserva o historico original e registra evento `COMPROVANTE_REMOVIDO`.
- `PrioridadeDiretoriaController.excluir`: marca o lote com status `EXCLUIDO` e remove da listagem padrao.

### Segundo lote implantado

- `ConversaInternaController.deletarMensagem`: marca `deleted_at` na mensagem e em seus anexos, preservando a trilha da conversa.
- `ComercialContratoController.destroy`: marca o contrato comercial com status `EXCLUIDO`, preservando compradores, parcelas, documentos e eventos.
- `ComercialContratoDocumentoController.excluirDocumento`: marca o documento comercial com status `EXCLUIDO`.
- `PrioridadeLoteItem`: itens removidos ou substituidos recebem `deleted_at`, preservando o historico de composicao do lote.
- `SolicitacaoCompraRespostaItem`: novas respostas preservam respostas anteriores com `deleted_at`, evitando perda do historico de cotacao do fornecedor.

### Ja aderentes a regra

- `ArquivoModeloController.remover`: ja usa `ativo = false`.
- `ApropriacaoController.destroy`: ja usa `ativo = false`.
- `ParceiroCategoriaController.destroy`: ja usa `ativo = false`.
- `FornecedorCompraController.destroy`: ja usa `ativo = false`.
- `PedidoCompraController.removeItem`: ja usa `removido = true` e registra log do item.
- `TreinamentoController.destroy`: arquiva conteudo de treinamento.

### Ja aderentes a exclusao logica

- `PaymentBeneficiaryController.destroy`: ja usa `deactivateBeneficiary`.

### Permitidos com cautela

- Limpeza de cache SST.
- Logs tecnicos com politica de retencao.
- Timeouts de conexao HTTP/socket (`req.destroy`, `socket.destroy`), que nao representam exclusao de registro de negocio.
- Tabelas de junção recriadas em telas de configuracao, desde que os registros mestres sejam preservados e exista trilha suficiente da alteracao.

### Pontos que continuam em auditoria fina

Alguns `destroy()` restantes nao estao ligados diretamente ao botao Excluir de registros mestres. Eles aparecem em rotinas de substituicao de vinculos, limpeza tecnica ou timeout:

- vinculos de apropriacao/credor do contrato ao salvar uma nova composicao;
- vinculos de usuario com obras ao salvar uma nova permissao;
- permissoes de provisao financeira ao regravar uma configuracao;
- compradores de contrato comercial ao substituir a lista;
- itens de tabela de preco comercial ao regravar a tabela;
- eventos temporarios de apuracao RH/DP ao recalcular;
- cache SST e logs de seguranca com politica de retencao;
- sockets/requisicoes HTTP encerrados por timeout.

Esses pontos nao devem apagar registros mestres de negocio. Quando qualquer um deles virar acao final do usuario sobre um registro rastreavel, deve ser migrado para `ativo = false`, `deleted_at`, status de negocio ou tabela de versoes.

## Regra para proximas implementacoes

Toda nova rota de exclusao deve responder a uma destas perguntas antes de ser criada:

1. O registro e de negocio, financeiro, operacional, documental ou historico?
2. Existe tela ou relatorio que pode precisar desse registro no futuro?
3. Existe chave estrangeira apontando para ele?
4. Existe impacto em auditoria, rastreabilidade ou conferencia?

Se qualquer resposta for sim, a rota nao deve apagar fisicamente.

## Notificacoes configuraveis

A configuracao futura de notificacoes deve usar um catalogo central de eventos. Cada evento deve ter:

- chave tecnica;
- modulo;
- nome amigavel;
- descricao;
- publico padrao;
- flag ativo/inativo.

A configuracao do superadmin deve controlar quais eventos aparecem no sino, sem impedir que eventos criticos continuem sendo gravados no historico/auditoria quando necessario.
