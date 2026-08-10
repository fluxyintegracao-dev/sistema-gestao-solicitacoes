# Matriz de smoke test - cheques de terceiros e baixa composta

## Preparacao

1. Aplicar as migrations no ambiente de desenvolvimento.
2. Liberar as permissoes granulares somente para os usuarios de teste.
3. Separar duas empresas, duas contas bancarias, dois credores, um cartao e pelo menos tres titulos `PAGAR` abertos.
4. Registrar os saldos originais dos titulos e dos relatorios financeiros.

## Custodia

| Cenario | Acao | Resultado esperado |
| --- | --- | --- |
| Cadastro manual | Criar cheque com empresa, numero, titular, valor, vencimento e justificativa | Cheque `EM_CARTEIRA`, codigo proprio e evento `SALDO_INICIAL` |
| Origem sem obra | Criar sem obra e com justificativa | Cadastro aceito e auditavel |
| Duplicidade | Repetir empresa, banco, agencia, conta, numero e valor | Operacao rejeitada sem novo registro |
| Deposito | Depositar em conta ativa da mesma empresa | Status `DEPOSITADO` e conta registrada no historico |
| Conta de outra empresa | Tentar deposito cruzado | Operacao rejeitada |
| Transferencia | Transferir cheque em carteira para outra empresa | Custodia alterada e evento com origem/destino |
| Estado invalido | Tentar transferir cheque depositado/utilizado | Operacao rejeitada |
| Permissao | Acessar/operar sem a chave granular | HTTP 403 e acao ausente no frontend |

## Importacao

| Cenario | Acao | Resultado esperado |
| --- | --- | --- |
| Modelo | Baixar planilha | Arquivo XLSX valido com colunas operacionais |
| Preview | Importar linhas validas e invalidas | Modal rolavel mostra validacao por linha |
| Edicao | Corrigir, excluir e adicionar no modal | Lote atualizado localmente e revalidado ao confirmar |
| Atomicidade | Confirmar lote contendo uma linha invalida | Nenhum cheque criado |
| Idempotencia | Repetir a confirmacao com a mesma chave | Nenhum cheque duplicado |

## Baixa composta

| Cenario | Acao | Resultado esperado |
| --- | --- | --- |
| Pix + cheque | Pagar titulos do mesmo credor/empresa com duas fontes | Um grupo, dois componentes, movimentos e alocacoes consistentes |
| Multiplas contas | Usar duas contas da mesma empresa | Componentes separados e total exato |
| Credores diferentes | Selecionar titulos de credores distintos | Preview rejeitado |
| Empresas diferentes | Selecionar titulos de empresas distintas | Preview rejeitado |
| Conta/cartao cruzado | Usar instrumento de outra empresa | Preview rejeitado |
| Cheque cruzado | Usar cheque sob custodia de outra empresa | Preview rejeitado |
| Cheque parcial | Informar valor diferente da face | Preview rejeitado |
| Sobrepagamento | Alocar acima do saldo do titulo | Preview rejeitado |
| Distribuicao incompleta | Fonte diferente da soma das alocacoes | Preview rejeitado |
| Concorrencia | Confirmar duas vezes simultaneamente | Apenas um grupo criado |
| Falha intermediaria | Forcar falha no segundo titulo | Nenhum movimento/componente consumido |

## Estorno e regressao

| Cenario | Acao | Resultado esperado |
| --- | --- | --- |
| Estorno do grupo | Estornar baixa composta com justificativa | Todos os movimentos `ESTORNADO`, saldos restaurados e cheque em carteira |
| Duplo estorno | Repetir estorno | Operacao rejeitada sem alterar saldos |
| Cheque com evento posterior | Tentar estornar grupo inconsistente | Operacao bloqueada para revisao manual |
| Baixa simples | Baixar titulo por uma unica forma | Fluxo anterior continua funcionando |
| Baixa em massa | Executar baixa em massa tradicional | Formas cadastradas e comportamento anterior preservados |
| Cartao | Baixar titulo por cartao no fluxo anterior | Fatura e vinculos permanecem consistentes |
| Compras/solicitacoes | Quitar e estornar titulo de origem | Estados derivados sincronizam como antes |
| Relatorios | Comparar antes/depois da baixa e do estorno | Realizado e saldo respondem aos movimentos ativos |

## Automacao minima

Executar no backend:

```bash
npm run test:cheques-terceiros
npm run test:baixa-massa-formas
```

Executar no frontend:

```bash
npm run build
```

