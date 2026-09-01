# Prestacao responsiva e retorno apos quitacao — 2026-09-01

## Interface

O componente compartilhado da prestacao de contas estava limitado a duas das doze colunas da
Nova Solicitacao e ainda exigia uma tabela com largura minima de 760px. No detalhe havia espaco
suficiente, mas na criacao os controles eram comprimidos e parte da linha ficava inacessivel.

O bloco agora ocupa a largura integral do formulario e usa linhas responsivas:

- celular: campos empilhados e rotulados;
- tablet: duas colunas;
- desktop: obra, apropriacao, valor e acao na mesma linha;
- resumo e botao de envio se adaptam sem rolagem horizontal obrigatoria.
- valores de rateio aparecem em moeda brasileira (`R$ 3.000,00`) e alternam para o numero
  editavel somente enquanto o campo esta em foco.

O formulario de prestacao permanece no detalhe da solicitacao anterior. A Nova Solicitacao nao
duplica mais esse formulario: quando o cartao esta bloqueado por um ciclo anterior, orienta o
usuario a continuar no registro existente.

## Nova recarga bloqueada por ciclo anterior

O contexto do cartao agora inclui a regra oficial de interacao da solicitacao anterior: setor
atual, setor do usuario, permissao de solicitar retorno e eventual pedido pendente.

Na Nova Solicitacao:

- se a solicitacao anterior estiver fora do setor, explica que ela precisa retornar e permite
  solicitar o retorno com motivo, quando o usuario possui a permissao granular;
- se ja existir pedido, mostra `Retorno solicitado` e o motivo enviado;
- quando a solicitacao voltar ao setor do usuario, oferece `Abrir solicitacao anterior`;
- orienta que quitacao integral, parcial ou valor efetivo diferente do solicitado exige concluir
  a prestacao no registro anterior antes de uma nova recarga;
- o botao de criar permanece bloqueado enquanto o ciclo anterior nao for validado.

## Retorno ao setor criador

Toda sincronizacao central de baixa verifica os titulos quitados vinculados a solicitacao. Para
cada titulo ainda nao processado:

- localiza o primeiro evento `SOLICITACAO_CRIADA` e usa o setor fotografado nele;
- em solicitacoes legadas sem essa acao, usa o primeiro evento auditavel que possua setor;
- devolve a solicitacao ao setor criador quando ela estiver em outro setor;
- registra `ENVIADA_SETOR` com metadata da automacao e IDs dos titulos quitados;
- quando a solicitacao ja esta na origem, registra apenas a confirmacao auditavel;
- expira pedidos de retorno pendentes que perderam o objeto com a movimentacao automatica;
- nao repete a movimentacao em retries de baixa ou conciliacao.

A regra passa pelo sincronizador compartilhado e cobre baixas comuns, conciliacao, Recarga de
Cartao e contratos do fluxo novo.

## Arquivos alterados

- `frontend/src/components/recarga-cartao/RecargaCartaoFields.jsx`
- `frontend/src/components/recarga-cartao/PrestacaoRecargaCartao.jsx`
- `backend/src/controllers/RecargaCartaoController.js`
- `backend/src/services/recargaCartaoService.js`
- `backend/src/services/solicitacaoFinanceiroStatusService.js`
- `backend/scripts/validarRecargaCartao.js`

## Validacoes

- build do frontend aprovado: 373 modulos;
- `node --check` aprovado no servico financeiro e no QA de recarga;
- `git diff --check` aprovado;
- QA transacional ampliado para conferir retorno `FINANCEIRO -> OBRA` e idempotencia do retry;
- execucao local do QA depende de credenciais MySQL, ausentes neste workspace.

Nao houve migration.
