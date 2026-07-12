# Changelog Documental e Operacional

## 2026-07-12 - Redefinicao do modulo SST

- SST redefinido como modulo documental simples;
- escopo limitado a PCMSO, PGR, exames, ASO, EPI, treinamentos ocupacionais, LTCAT e avaliacoes quantitativas;
- anexos previstos para todas as entidades do novo escopo;
- removida da documentacao a conexao com sistemas governamentais;
- removidos documentos antigos de fases, IA, automacoes e operacao enterprise;
- criado plano obrigatorio de inventario, migracao, simplificacao e remocao segura do codigo legado;
- nenhuma remocao de runtime ou banco executada nesta etapa.

## 2026-07-12 - Consolidacao documental

- removidos documentos ligados a estrategias e integracoes descontinuadas;
- removidos materiais de posicionamento e distribuicao do produto;
- definida documentacao canonica por modulo;
- criado mapa de dependencias e propriedade dos dados;
- documentadas regras transversais de idempotencia e transacoes;
- documentos de fase, sprint e relatorio passaram a ser tratados apenas como historico;
- corrigida a descricao do runtime para migrations controladas, sem `sync({ alter: true })` normal.

## Regra de manutencao

Mudancas futuras devem atualizar o documento canonico do modulo no mesmo commit. Este arquivo registra apenas alteracoes percebidas na operacao ou na governanca documental.
