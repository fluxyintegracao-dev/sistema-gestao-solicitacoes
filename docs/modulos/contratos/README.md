# Modulo CONTRATOS

## Papel

Contratos mantem o contexto contratual operacional, seus vinculos, referencias e arquivos. Contrato operacional nao e titulo financeiro e nao se confunde com contrato de venda do modulo Comercial.

## Regras

- contratos podem ser vinculados a parceiro, obra e solicitacoes;
- referencias de contrato so aparecem quando o modulo estiver habilitado;
- desabilitar o modulo remove exigencias de interface e validacao, mas nao apaga dados existentes;
- anexos usam armazenamento privado e autorizacao do contrato;
- alteracao ou encerramento nao pode apagar historico nem invalidar silenciosamente solicitacoes existentes;
- exclusao deve ser logica quando houver qualquer vinculo.

## Integracoes

Solicitacoes consome o contrato como contexto. Obras pode consolidar contratos relacionados. Arquivos fornece o objeto fisico; o modulo Contratos decide quem pode acessa-lo. Comercial possui seus proprios contratos de venda e apenas integra quando houver regra explicita.

## Mudanca segura

Validar criacao, edicao, anexos, pesquisa, solicitacoes vinculadas, filtros, exportacao, permissoes e comportamento com o modulo desabilitado.
