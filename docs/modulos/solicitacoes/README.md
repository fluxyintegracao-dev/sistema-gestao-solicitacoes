# Modulo SOLICITACOES

## Documentacao operacional relacionada

- [Fluxos de solicitacoes iniciais do setor OBRA](./FLUXOS_INICIAIS_OBRA.md): matriz de producao, campos, destinos, automacoes, fluxogramas e separacao entre regra vigente e legado.

## Papel e fronteira

Solicitacoes e o hub operacional entre usuarios, setores, obras, parceiros, contratos, compras e financeiro. O modulo e dono da abertura, area atual, destino, atribuicao, status setorial, comentarios, anexos, historico e regras de movimentacao. Nao e dono de apropriacao, contrato, pedido ou titulo financeiro.

## Dados e regras

- toda solicitacao exige obra, area responsavel e tipo compativel;
- parceiro, valor, vencimento, contrato e apropriacao dependem do tipo e dos modulos ativos;
- o backend valida a combinacao entre area, tipo e obra;
- para novas solicitacoes, `area_responsavel` representa desde a criacao o setor operacional selecionado;
- assumir e enviar dependem do setor atual e das permissoes do usuario;
- usuarios podem possuir setor principal e setores adicionais;
- `SUPERADMIN` e excecao administrativa, mas a excecao deve continuar auditada;
- setor `OBRA` respeita vinculo e restricoes especificas;
- arquivamento e individual por usuario e nao altera o registro global;
- alteracoes de status, envio e automacao geram historico.

## Encaminhamento atual, compatibilidade e automacoes

Novas solicitacoes seguem diretamente para a area responsavel selecionada e nao entram no fluxo de aprovacao por diretoria. Os campos e endpoints de diretoria permanecem no backend somente para compatibilidade com registros antigos que ja possuam `fluxo_aprovacao_diretoria = true`; eles nao devem ser reutilizados para criar novos fluxos. Prioridades da diretoria continuam sendo um dominio operacional separado e nao alteram o setor responsavel. Tipos compartilhados ampliam visibilidade sem transferir propriedade. Automacao por status so ocorre depois de uma transicao valida e nao pode ignorar permissoes ou consistencia.

## Dependencias

- recebe obra e apropriacao de `OBRAS`;
- recebe parceiro do cadastro mestre;
- recebe contrato de `CONTRATOS` quando habilitado;
- pode originar `COMPRAS` e `FINANCEIRO` por acoes explicitas e idempotentes;
- publica historico e notificacoes para os interessados.

## Permissoes e seguranca

Visibilidade combina perfil, setores, obra, autoria, atribuicao, historico e configuracoes especiais. Filtros e exportacao devem usar o mesmo universo autorizado da listagem. O frontend apenas oculta acoes; o backend revalida detalhe, anexos, status, envio, assuncao e exportacao.

## Mudanca segura

Alteracoes em status, area, tipo, obra, parceiro ou apropriacao exigem testes de criacao direta no setor selecionado, compatibilidade de registros antigos de diretoria, detalhe, listagem, filtros, exportacao, prioridades, automacao, compras, financeiro, notificacoes e usuarios multissetor.
