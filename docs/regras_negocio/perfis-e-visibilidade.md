# Perfis e Visibilidade

## Perfis centrais
- `SUPERADMIN`
- `ADMIN`
- `USUARIO`

## Fatores de visibilidade
A visibilidade efetiva depende de combinacao entre:
- perfil
- setor do usuario
- setores adicionais vinculados ao usuario
- vinculo com obra
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
- `SUPERADMIN` pode marcar usuarios com permissao especial para alterar o valor total da solicitacao em `Configuracoes > Alterar Valor da Solicitacao`.
- `SUPERADMIN` e `ADMIN` do setor `GEO` continuam com permissao padrao para alterar o valor da solicitacao.
- arquivamento de solicitacao e individual por usuario.
- usuarios do setor OBRA trabalham com escopo restrito por obra/vinculo.
- usuarios podem ter mais de um setor vinculado:
  - `users.setor_id` continua sendo o setor principal para compatibilidade
  - `usuario_setores` armazena todos os setores vinculados
  - a listagem, detalhe e acoes de solicitacao consideram o setor principal e os setores adicionais
  - ao importar usuarios por CSV, o primeiro setor informado vira o principal e os demais ficam vinculados
- quando a obra estiver classificada e houver configuracao de aprovacao por diretoria:
  - obra `PUBLICA` deve nascer em `DIR_OBRAS_PUBLICAS`
  - obra `PRIVADA` deve nascer em `DIR_OBRAS_PRIVADAS`
  - para usuarios do setor `OBRA`, essa escolha passa a seguir a classificacao da obra e a configuracao de `Areas Visiveis para OBRA`, sem depender de `Areas por Setor de Origem`
  - na criacao, o usuario seleciona a area destino operacional e o sistema grava a diretoria correspondente em campo separado
  - a solicitacao nasce na diretoria da classificacao da obra e, apos aprovacao, segue para a area operacional selecionada na criacao
  - a configuracao de destino por tipo permanece como fallback para registros antigos ou sem destino persistido
  - o setor destino vira o dono da solicitacao para seguir o fluxo normal
  - `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS` continuam vendo solicitacoes novas do fluxo que pertencem a sua diretoria, mesmo apos aprovacao e envio
  - essa visibilidade adicional depende do marcador formal `fluxo_aprovacao_diretoria`
  - solicitacoes antigas continuam no comportamento anterior
  - `DIR_ADMIN` nao ganha visibilidade global automatica; continua vendo apenas o que estiver no setor dela ou o que chegar por mencao/atribuicao
  - o criador da obra continua vendo a solicitacao
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
  - lotes abertos listam solicitacoes elegiveis independentemente do setor atual
  - solicitacoes com status `PAGA` nao aparecem como disponiveis para prioridade
  - solicitacoes ja adicionadas em outro lote podem aparecer em novos lotes abertos enquanto nao estiverem `PAGA`
  - no fluxo novo, a solicitacao precisa estar aprovada pela diretoria, e solicitacoes legadas sem fluxo de diretoria continuam elegiveis
  - `DIR_OBRAS_PUBLICAS` e `DIR_OBRAS_PRIVADAS` podem selecionar solicitacoes elegiveis e abrir um pedido de urgencia para aprovacao da `DIR_ADMIN`
  - pedidos de urgencia registram o setor criador do lote para diferenciar lotes solicitados pela `DIR_ADMIN` de lotes solicitados pelas proprias diretorias
  - pedidos de urgencia so viram prioridade autorizada depois da finalizacao/aprovacao pela `DIR_ADMIN` ou `SUPERADMIN`
  - a autorizacao de prioridade nao muda o setor responsavel da solicitacao
  - a autorizacao marca a solicitacao como `prioridade_diretoria_ativa`

## Filtros
Filtros da listagem precisam obedecer a visibilidade efetiva do usuario. Nao assumir que filtros podem listar valores fora do universo visivel.
