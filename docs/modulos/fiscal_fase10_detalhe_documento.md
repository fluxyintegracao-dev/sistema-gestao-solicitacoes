# Modulo Fiscal - Fase 10 Detalhe do documento fiscal

## Escopo entregue

- Pagina protegida de detalhe do documento fiscal em `/fiscal/documentos/:id`.
- Visualizacao de resumo, empresa monitorada, fornecedor, destinatario, status, origem e chaves de arquivo.
- Acesso aos arquivos XML/PDF por URL assinada de curta duracao, mantendo o S3 privado.
- Exibicao inicial de vinculos, divergencias e eventos fiscais ja registrados no banco.
- Exibicao tecnica do `parsed_xml_json` e `raw_summary_json` para conferencia em DEV.
- Listagem de documentos agora possui link direto para detalhe.

## Backend

- `GET /api/fiscal/documents/:id` continua protegido por `fiscal.document.view`.
- O retorno do detalhe agora inclui:
  - `company`
  - `links`
  - `divergences`
  - `events`

## Frontend

- Nova pagina: `frontend/src/modules/fiscal/pages/FiscalDocumentDetail.jsx`.
- Nova rota: `/fiscal/documentos/:id`.
- API adicionada: `getFiscalDocument(id)`.

## Regras mantidas

- Nao consulta SEFAZ.
- Nao gera financeiro.
- Nao altera pedidos, compras ou solicitacoes.
- Nao expõe XML diretamente por URL publica permanente.

## Proxima etapa recomendada

- Criar upload manual opcional de DANFE/PDF.
- Criar acoes manuais de ignorar documento e registrar vinculo manual.
- Depois disso, iniciar matching sugerido, ainda sem automatizar confirmacao.
