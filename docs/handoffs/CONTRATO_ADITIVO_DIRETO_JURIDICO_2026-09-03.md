# Contrato — aditivo acima do limite segue direto ao Juridico

Data: 2026-09-03

## Causa confirmada

O pedido de aditivo tinha o setor `GEO` fixado em `contratoAditivoService.js`. A configuracao
`CONTRATO_LIMITE_JURIDICO`, usada na abertura do contrato, nao participava desse roteamento.

## Regra entregue

- O corte usa a configuracao `CONTRATO_LIMITE_JURIDICO`; o fallback continua R$ 50.000,00.
- O valor comparado e o compromisso total depois do pedido:
  - valor original do contrato;
  - mais aditivos ja aprovados;
  - mais o valor do novo aditivo.
- Exatamente no limite, o pedido continua em `GEO / PED. ADITIVO`.
- Acima do limite, segue diretamente para `JURIDICO / PENDENTE`.
- Aditivo somente de prazo soma zero, mas segue ao Juridico quando o contrato ja esta acima do
  limite.
- O historico `ADITIVO_SOLICITADO` e o envio `ENVIADA_SETOR` registram o destino calculado, o limite
  aplicado e o total considerado.
- Contratos do fluxo novo e legados usam o mesmo calculo. No legado, o status historico de abertura
  da solicitacao propria permanece `PENDENTE`.

## Arquivos alterados

- `backend/src/services/contratoAditivoService.js`
- `backend/src/services/contratoAditivoRoteamento.js`
- `backend/scripts/validarRoteamentoAditivoJuridico.js`

## Validacoes

- `node --check` nos arquivos alterados: aprovado.
- Prova pura, sem conexao nem escrita no banco: aprovada em quatro cenarios.
  - total exatamente no limite;
  - um centavo acima;
  - acumulacao de aditivos anteriores;
  - aditivo de prazo em contrato ja acima do limite.
- `git diff --check`: aprovado.

## Banco e deploy

- Nenhuma migration.
- Nenhum dado de teste criado.
- O backend dev precisa ser reiniciado depois que a EC2 receber o commit.
- Nenhuma operacao de producao faz parte desta entrega.
