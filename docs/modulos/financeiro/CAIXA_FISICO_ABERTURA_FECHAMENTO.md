# Caixa fisico: abertura, movimentacao e fechamento

## Objetivo

Registrar o dinheiro mantido fisicamente em caixa com abertura, livro de movimentos,
conferencia e fechamento auditaveis. O caixa fisico nao depende da conciliacao OFX:
seus saldos sao formados pelos movimentos manuais e financeiros vinculados a sessao.

## Regras operacionais

- somente contas com tipo operacional `CAIXA_INTERNO` usam este fluxo;
- abertura, entrada, saida, estorno e fechamento exigem as permissoes financeiras
  correspondentes;
- entradas e saidas manuais exigem valor positivo, descricao e natureza validos;
- o estorno exige justificativa e so pode atingir lancamentos manuais ativos;
- cada inclusao e estorno atualiza o resumo da sessao na mesma transacao;
- o fechamento nao aceita data retroativa ao dia atual nem ao movimento mais recente;
- divergencias entre saldo contado e saldo calculado ficam registradas com justificativa;
- a trilha de auditoria preserva usuario, data, valor, documento e motivo.

## Matriz de smoke test

| Cenario | Resultado esperado |
| --- | --- |
| Abrir uma conta `CAIXA_INTERNO` | Sessao aberta com saldo inicial e data registrados |
| Registrar entrada manual | Livro e total de entradas aumentam uma unica vez |
| Registrar saida manual | Livro e total de saidas aumentam uma unica vez |
| Repetir envio protegido | Nenhum movimento duplicado e criado |
| Estornar movimento manual | Movimento original fica estornado e o resumo e recalculado |
| Tentar estornar movimento nao manual | Operacao bloqueada |
| Fechar sem divergencia | Saldo contado e calculado fecham a sessao |
| Fechar com divergencia | Justificativa obrigatoria e divergencia auditada |
| Informar data retroativa | Operacao bloqueada no frontend e no backend |
| Acessar sem permissao | Rota e acoes permanecem bloqueadas |

## Verificacao automatizada

Execute `node backend/scripts/validarCaixaFisico.js`. O validador confere payloads,
contratos do servico, rotas protegidas, integracao do frontend e esta documentacao.
