# Modulo COMERCIAL

## Papel

Comercial representa a operacao de venda da construtora: empreendimentos, unidades, clientes, contratos de venda, parcelas e carteira de recebimentos. Nao representa distribuicao ou venda do sistema FLUXY.

## Propriedade

- empreendimento e unidade pertencem ao modulo Comercial;
- parceiro/cliente pertence ao cadastro mestre de Parceiros;
- contrato de venda e sua agenda pertencem ao Comercial;
- titulo, baixa e estorno pertencem ao Financeiro;
- boleto pertence ao modulo Boletos.

## Regras

- unidade deve pertencer ao empreendimento correto;
- contrato exige cliente, unidade, valores e condicoes consistentes;
- uma unidade nao pode possuir contratos ativos conflitantes;
- agenda de recebimentos deve fechar o valor contratual conforme ajustes permitidos;
- cada parcela gera no maximo um titulo financeiro de origem;
- alterar contrato com titulo movimentado exige tratamento explicito;
- cancelamento preserva historico e nao apaga recebimentos;
- dinheiro, PIX, cartao, boleto, permuta e bens devem manter forma e evidencia da liquidacao.

## Integracoes

Parceiros fornece cliente. Obras pode fornecer empreendimento/centro relacionado quando configurado. Financeiro recebe parcelas e continua autoridade de recebimentos. CRM pode converter oportunidade em cliente/contrato apenas por fluxo autorizado. Documentos e assinatura externa devem preservar status e auditoria.

## Mudanca segura

Testar disponibilidade de unidade, valor total, agenda, geracao idempotente de titulos, cancelamento, recebimentos, relatorios e permissoes.
