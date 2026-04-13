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
  - a diretoria aprova e envia a solicitacao para o setor destino configurado pelo `SUPERADMIN`
  - o setor destino vira o dono da solicitacao para seguir o fluxo normal
  - a diretoria que aprovou continua vendo a solicitacao pelo historico
  - o criador da obra continua vendo a solicitacao

## Filtros
Filtros da listagem precisam obedecer a visibilidade efetiva do usuario. Nao assumir que filtros podem listar valores fora do universo visivel.
