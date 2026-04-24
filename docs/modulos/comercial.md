# Modulo - Comercial

## Objetivo

Controlar a etapa comercial da construtora de forma simples, auditavel e integrada ao financeiro existente do FLUXY.

## O que o modulo entrega hoje

- cadastro de empreendimentos vinculados a obras
- cadastro de unidades por empreendimento
- mapa operacional de unidades por empreendimento, bloco, torre ou tipologia
- controle de status da unidade
- reserva opcional de unidade por parceiro
- tabelas de preco por empreendimento, com ativacao controlada e aplicacao do valor de tabela nas unidades
- cadastro de contratos comerciais usando parceiro como cliente
- vinculo opcional de corretor usando parceiro classificado como `CORRETOR`
- geracao automatica da agenda financeira do contrato
- composicao da agenda financeira por multiplas formas de pagamento no contrato
- campos monetarios da tela de contratos com formatacao em moeda brasileira
- geracao automatica de titulos financeiros a receber por parcela
- geracao automatica do titulo financeiro de comissao do corretor quando houver percentual informado
- consulta detalhada do contrato com parcelas e titulos gerados
- indicadores financeiros do contrato com valor em aberto, valor vencido, proximo vencimento e status sugerido
- sincronizacao do status contratual a partir do financeiro
- distrato guiado com bloqueio quando houver parcela baixada
- troca de unidade com ajuste financeiro positivo ou negativo e trilha de eventos
- historico operacional do contrato com eventos comerciais auditaveis
- atualizacao de situacao do contrato com reflexo no status da unidade
- integracao operacional com contas a receber para complementar o titulo com os dados do boleto emitido no banco

## Escopo funcional atual

- `COMERCIAL` e a chave principal do modulo
- acesso administrativo pela mesma logica de habilitacao e ocultacao dos demais modulos
- cliente comprador reaproveita o cadastro mestre de `Parceiros`
- o financeiro continua como motor central de titulos, baixa, estorno, auditoria e relatorios

## Regras-chave

- o modulo comercial nao cria um financeiro paralelo
- cada parcela contratual gera um titulo financeiro a receber
- quando a forma prevista for boleto, o titulo pode nascer marcado como cobranca pendente de emissao
- a tabela de preco ativa por empreendimento atualiza o valor de tabela das unidades vinculadas
- a agenda do contrato pode combinar blocos periodicos e lancamentos manuais com formas diferentes, como boleto, PIX, bens e outros
- quando a forma escolhida for `BENS`, `PERMUTA` ou `OUTROS`, o contrato deve registrar o detalhe do que esta sendo recebido e esse contexto acompanha a parcela
- categoria financeira do contrato deve aceitar `RECEBER` ou `AMBOS`
- categoria financeira da comissao, quando usada, deve aceitar `PAGAR` ou `AMBOS`
- cancelamento ou distrato de contrato com parcela ja baixada e bloqueado
- troca de unidade so pode usar unidade disponivel, reservada para o mesmo cliente ou ja vinculada ao proprio contrato
- troca de unidade com diferenca positiva gera novo recebivel de ajuste
- troca de unidade com diferenca negativa so pode reduzir titulos ainda abertos e sem baixa
- o status `INADIMPLENTE` pode ser sugerido pelo financeiro e sincronizado no contrato sem mexer nas baixas ja realizadas
- remocao ou alteracao estrutural da comissao fica bloqueada quando ja houver pagamento registrado
- status da unidade deve refletir a situacao contratual para evitar dupla venda operacional

## Formas de recebimento suportadas no financeiro

Os titulos originados do comercial podem ser baixados no financeiro com trilha auditavel usando:

- dinheiro
- PIX
- cartao
- transferencia
- boleto
- cheque
- permuta
- bens
- outros

Quando aplicavel, o financeiro tambem registra:

- tipo de permuta
- categoria do bem
- descricao do bem
- valor de referencia do bem
- documento de referencia

## O que fica separado para a proxima fase

- emissao de boletos
- homologacao bancaria
- remessa e retorno CNAB
- conciliacao bancaria especifica de cobranca registrada

Esse bloco deve continuar no modulo separado `BOLETOS`.

## Fluxo operacional recomendado antes do submodulo bancario

1. Fechar a venda e formalizar o contrato.
2. Gerar os titulos a receber no `Fluxy` a partir do contrato.
3. Emitir o boleto diretamente no banco.
4. Complementar no `Fluxy` o mesmo titulo com os dados do boleto emitido.
5. Importar o `OFX` da conta correspondente.
6. Fazer a conciliacao e a baixa no financeiro.

## Interfaces administrativas atuais

- `Comercial > Empreendimentos`: cadastro do contexto comercial por obra
- `Comercial > Unidades`: cadastro, reserva e disponibilidade das unidades
- `Comercial > Mapa de unidades`: leitura visual da ocupacao e disponibilidade
- `Comercial > Tabelas de preco`: gestao da tabela comercial vigente por empreendimento
- `Comercial > Contratos`: venda, recebiveis, comissao, distrato, troca de unidade e historico operacional
