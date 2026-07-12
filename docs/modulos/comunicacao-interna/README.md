# Modulo COMUNICACAO_INTERNA

## Papel

Comunicacao Interna fornece conversas e mensagens entre usuarios dentro do sistema. Nao substitui historico de negocio: uma decisao que altera solicitacao, compra ou financeiro deve ser registrada tambem no dominio correspondente.

## Regras

- remetente e participantes devem ser usuarios ativos e autorizados;
- usuario ve apenas conversas das quais participa ou possui permissao administrativa explicita;
- mensagem enviada nao deve ser apagada fisicamente;
- edicao ou retirada, quando existente, deixa marcador auditavel;
- anexos usam validacao, limite, antivírus configurado e URL assinada;
- mencoes e notificacoes nao podem ser duplicadas por retry;
- paginacao e leitura devem escalar sem carregar todo o historico;
- conteudo nao deve conceder acesso ao registro de outro modulo.

## Integracoes

Usuarios fornece identidade. Arquivos fornece armazenamento. Notificacoes informa nova mensagem. Links para solicitacoes ou outros registros continuam sujeitos a autorizacao do modulo de destino.

## Mudanca segura

Testar participantes, nao participantes, anexos, paginacao, marcacao de leitura, notificacoes, concorrencia e links protegidos.
