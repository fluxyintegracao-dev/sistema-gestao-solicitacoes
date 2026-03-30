# Regras de Solicitacoes

## Fluxo principal
- criar solicitacao
- listar
- detalhar
- comentar
- anexar arquivos
- assumir responsavel
- enviar para setor
- alterar status
- arquivar/desarquivar individualmente

## Regras de historico
O historico precisa registrar:
- mudanca de status
- envio entre setores
- atribuicao e assuncao de responsavel
- comentarios
- anexos
- numero no SIENGE

## Paginacao
A listagem de solicitacoes roda com paginacao no backend. Filtros precisam atuar antes da paginacao.

## Regra operacional importante
Se um filtro parece funcionar so na pagina atual, ha regressao. A filtragem correta deve acontecer no backend antes da pagina ser calculada.
