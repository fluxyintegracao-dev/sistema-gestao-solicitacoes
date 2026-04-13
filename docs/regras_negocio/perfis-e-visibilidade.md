# Perfis e Visibilidade

## Perfis centrais
- `SUPERADMIN`
- `ADMIN`
- `USUARIO`

## Fatores de visibilidade
A visibilidade efetiva depende de combinacao entre:
- perfil
- setor do usuario
- vinculo com obra
- historico da solicitacao
- configuracoes de setores e tipos

## Regras criticas
- `SUPERADMIN` continua como excecao administrativa ampla.
- numero do pedido permanece restrito ao escopo GEO.
- lista de status no detalhe segue o setor do usuario logado.
- assumir e enviar solicitacoes dependem do setor atual da solicitacao.
- `SUPERADMIN` pode marcar usuarios com permissao especial para enviar solicitacoes fora do setor atual da solicitacao.
- a permissao especial de envio nao remove o bloqueio do setor `OBRA`.
- arquivamento de solicitacao e individual por usuario.
- usuarios do setor OBRA trabalham com escopo restrito por obra/vinculo.
- quando a obra estiver classificada e houver configuracao de aprovacao por diretoria:
  - obra `PUBLICA` deve nascer em `DIR_OBRAS_PUBLICAS`
  - obra `PRIVADA` deve nascer em `DIR_OBRAS_PRIVADAS`
  - para usuarios do setor `OBRA`, essa escolha passa a seguir a classificacao da obra e a configuracao de `Areas Visiveis para OBRA`, sem depender de `Areas por Setor de Origem`
  - a diretoria aprova e envia a solicitacao para o setor destino configurado pelo `SUPERADMIN`
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
  - o `SUPERADMIN` pode definir, por tipo e status, qual setor recebe automaticamente a solicitacao
  - a automacao ocorre apos a alteracao manual de status
  - o historico registra `ENVIO_AUTOMATICO_SETOR`
  - as automacoes legadas ja existentes no fluxo atual continuam valendo

## Filtros
Filtros da listagem precisam obedecer a visibilidade efetiva do usuario. Nao assumir que filtros podem listar valores fora do universo visivel.
