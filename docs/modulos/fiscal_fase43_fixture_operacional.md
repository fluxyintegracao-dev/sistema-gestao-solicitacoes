# Modulo Fiscal - Fase 43 Fixture operacional em DEV

## Objetivo

Melhorar o uso administrativo do ensaio local de DFe sem consultar a SEFAZ real.

## Alteracoes

- A tela `Fiscal > Diagnostico` agora carrega empresas fiscais ativas.
- O ensaio local de DFe permite selecionar a empresa fiscal antes de processar a fixture.
- Apos o processamento, o diagnostico e atualizado automaticamente.
- O resultado mostra links diretos para os documentos fiscais criados ou atualizados.
- O fluxo continua bloqueado em ambiente produtivo pelo backend.

## Rotas envolvidas

- `POST /api/fiscal/sync/run-fixture`
- `GET /api/fiscal/diagnostics`
- `GET /api/fiscal/companies`

## Seguranca

- Nao consulta a SEFAZ.
- Nao exige certificado real.
- Nao expoe XML no console.
- Usa bucket fiscal privado configurado para salvar payload bruto e XML da fixture.
- Permanece bloqueado se `NODE_ENV=production` ou `FISCAL_ENV=prod|production`.

## Validacao manual

1. Abrir `Fiscal > Diagnostico`.
2. Confirmar que existe empresa fiscal ativa e habilitada.
3. Confirmar que o storage fiscal esta configurado.
4. Selecionar a empresa fiscal.
5. Clicar em `Processar fixture DFe`.
6. Conferir o log retornado.
7. Abrir os links dos documentos processados.
8. Conferir os documentos em `Fiscal > Documentos`.

