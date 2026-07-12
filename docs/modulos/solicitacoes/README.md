# Modulo SOLICITACOES

## Papel e fronteira

Solicitacoes e o hub operacional entre usuarios, setores, obras, parceiros, contratos, compras e financeiro. O modulo e dono da abertura, area atual, destino, atribuicao, status setorial, comentarios, anexos, historico e regras de movimentacao. Nao e dono de apropriacao, contrato, pedido ou titulo financeiro.

## Dados e regras

- toda solicitacao exige obra, area responsavel e tipo compativel;
- parceiro, valor, vencimento, contrato e apropriacao dependem do tipo e dos modulos ativos;
- o backend valida a combinacao entre area, tipo, obra e diretoria;
- `area_responsavel` representa o setor atual; o destino posterior a aprovacao deve permanecer registrado separadamente;
- assumir e enviar dependem do setor atual e das permissoes do usuario;
- usuarios podem possuir setor principal e setores adicionais;
- `SUPERADMIN` e excecao administrativa, mas a excecao deve continuar auditada;
- setor `OBRA` respeita vinculo e restricoes especificas;
- arquivamento e individual por usuario e nao altera o registro global;
- alteracoes de status, envio, aprovacao e automacao geram historico.

## Diretoria e automacoes

Obras classificadas podem exigir aprovacao pela diretoria correspondente antes do destino operacional. Tipos compartilhados ampliam visibilidade sem transferir propriedade. Automacao por status so ocorre depois de uma transicao valida e nao pode ignorar permissoes ou consistencia.

## Dependencias

- recebe obra e apropriacao de `OBRAS`;
- recebe parceiro do cadastro mestre;
- recebe contrato de `CONTRATOS` quando habilitado;
- pode originar `COMPRAS` e `FINANCEIRO` por acoes explicitas e idempotentes;
- publica historico e notificacoes para os interessados.

## Permissoes e seguranca

Visibilidade combina perfil, setores, obra, autoria, atribuicao, historico e configuracoes especiais. Filtros e exportacao devem usar o mesmo universo autorizado da listagem. O frontend apenas oculta acoes; o backend revalida detalhe, anexos, status, envio, assuncao e exportacao.

## Mudanca segura

Alteracoes em status, area, tipo, obra, parceiro ou apropriacao exigem testes de criacao, detalhe, listagem, filtros, exportacao, diretoria, automacao, compras, financeiro, notificacoes e usuarios multissetor.
