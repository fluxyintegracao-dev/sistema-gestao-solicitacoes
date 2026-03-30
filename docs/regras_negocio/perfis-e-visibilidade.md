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
- arquivamento de solicitacao e individual por usuario.
- usuarios do setor OBRA trabalham com escopo restrito por obra/vinculo.

## Filtros
Filtros da listagem precisam obedecer a visibilidade efetiva do usuario. Nao assumir que filtros podem listar valores fora do universo visivel.
