# Perfis e Visibilidade

## Perfis centrais
- `SUPERADMIN`
- `ADMINISTRADOR`
- `ADMIN`
- `ESTAGIARIO`
- `USUARIO`

`SUPERADMIN` e `ADMINISTRADOR` formam o conceito `BusinessAdmin` usado em varias autorizacoes, mas somente `SUPERADMIN` possui bypass padrao de modulo. `ADMIN` nao tem acesso global automatico: suas excecoes dependem das permissoes e capacidades do setor.

Perfis especializados ainda reconhecidos por dominios antigos, como `FINANCEIRO` e perfis do CRM, devem ser tratados como compatibilidade localizada. A regra completa de precedencia esta em `../seguranca/autenticacao_autorizacao.md`.

## Fatores de visibilidade
A visibilidade efetiva depende de combinacao entre:
- perfil
- setor do usuario
- setores adicionais vinculados ao usuario
- vinculo com obra
- modulos habilitados e permissoes de area
- historico da solicitacao
- configuracoes de setores e tipos

## Regras criticas
- `SUPERADMIN` continua como excecao administrativa ampla.
- numero do pedido permanece restrito ao escopo GEO.
- lista de status no detalhe segue o setor do usuario logado.
- o `SUPERADMIN` pode configurar setores sem alteracao de status; nesses setores o detalhe oculta o botao `Alterar status` e o backend bloqueia a troca por API.
- assumir e enviar solicitacoes dependem do setor atual da solicitacao.
- `SUPERADMIN` pode marcar usuarios com permissao especial para enviar solicitacoes fora do setor atual da solicitacao.
- a permissao especial de envio nao remove o bloqueio do setor `OBRA`.
- arquivamento de solicitacao e individual por usuario.
- usuarios do setor OBRA trabalham com escopo restrito por obra/vinculo.
- usuarios podem ter mais de um setor vinculado:
  - `users.setor_id` continua sendo o setor principal para compatibilidade
  - `usuario_setores` armazena todos os setores vinculados
  - a listagem, detalhe e acoes de solicitacao consideram o setor principal e os setores adicionais
  - ao importar usuarios por CSV, o primeiro setor informado vira o principal e os demais ficam vinculados
- encaminhamento de novas solicitacoes:
  - a classificacao `PUBLICA` ou `PRIVADA` da obra nao redireciona mais a criacao para uma diretoria;
  - a solicitacao nasce diretamente na area responsavel escolhida e esse setor passa a ser seu dono operacional;
  - `Areas Visiveis para OBRA`, `Areas por Setor de Origem`, tipos por setor, autoria, atribuicao e historico continuam compondo a visibilidade;
  - registros antigos marcados com `fluxo_aprovacao_diretoria` preservam a visibilidade e as regras necessarias para concluir o fluxo legado;
  - `DIR_ADMIN`, `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS` nao ganham visibilidade global sobre solicitacoes novas apenas pelo perfil de diretoria;
  - o criador da obra continua vendo a solicitacao quando as demais regras de escopo permitirem.
- pagamentos parciais:
  - somente `FINANCEIRO` pode informar pagamentos pela interface
  - `SUPERADMIN` continua como excecao administrativa no backend
  - a listagem passa a exibir saldo enquanto a solicitacao nao estiver `PAGA`
  - o detalhe mantem valor total, pago acumulado e saldo atual
- tipos compartilhados entre setores:
  - o `SUPERADMIN` pode configurar o `setor de origem` que compartilha cada `tipo_solicitacao`
  - os setores extras marcados passam a visualizar a solicitacao quando ela estiver naquele setor de origem com o tipo configurado
  - essa configuracao nao muda o setor responsavel da solicitacao
- automacao de envio por status:
  - o `SUPERADMIN` pode definir, por area de origem, tipo e status, qual setor recebe automaticamente a solicitacao
  - a automacao ocorre apos a alteracao manual de status
  - o historico registra `ENVIO_AUTOMATICO_SETOR`
  - as automacoes legadas ja existentes no fluxo atual continuam valendo
- prioridades da diretoria:
  - `DIR_ADMIN` nao ganha visibilidade global automatica de solicitacoes, mas pode abrir lotes de prioridade
  - `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS` operam apenas lotes da propria classificacao configurada
  - `SUPERADMIN` pode configurar usuarios com acesso de leitura a pagina de prioridades da diretoria
  - usuarios configurados para leitura podem consultar lotes e solicitacoes ja vinculadas, mas nao criam, finalizam, cancelam ou excluem lotes
  - a permissao de leitura nao amplia o escopo de uma diretoria publica/privada para lotes da outra diretoria
  - `SUPERADMIN` pode finalizar lotes e excluir lotes sem itens autorizados
  - `SUPERADMIN` pode reabrir lotes finalizados para que a diretoria ajuste a selecao antes de finalizar novamente
  - diretorias podem salvar a selecao de um lote aberto sem finalizar; a selecao fica persistida para retomada posterior
  - lotes abertos seguem os criterios de classificacao, status e escopo implementados no dominio de prioridades; a inclusao no lote nao constitui aprovacao nem altera a area responsavel
  - a autorizacao de prioridade nao muda o setor responsavel da solicitacao
  - a autorizacao marca a solicitacao como `prioridade_diretoria_ativa`

## Filtros
Filtros da listagem precisam obedecer a visibilidade efetiva do usuario. Nao assumir que filtros podem listar valores fora do universo visivel.
