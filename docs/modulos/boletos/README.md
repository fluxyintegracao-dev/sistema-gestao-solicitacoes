# Modulo BOLETOS

## Papel

Boletos encapsula emissao, homologacao bancaria, remessa, retorno, baixa de cobranca e evidencias do convenio. O modulo depende de Financeiro e permanece separado para que regras bancarias nao contaminem titulos e recebimentos.

## Regras

- boleto referencia um titulo a receber valido;
- um titulo nao pode receber duas cobrancas ativas incompatíveis;
- emissao exige beneficiario, pagador, vencimento, valor e convenio homologado;
- nosso numero, linha digitavel e codigo de barras seguem o layout do banco;
- remessa e retorno possuem identificacao unica e auditoria;
- retorno pode atualizar a cobranca, mas baixa financeira exige evento bancario confiavel e reconciliacao definida;
- cancelamento e alteracao depois da remessa respeitam o estado bancario;
- arquivos CNAB sao privados e validados antes do envio.

## Dependencias

Financeiro fornece titulo, conta e movimentos. Comercial pode originar o titulo, mas nao emite boleto diretamente. Parceiros fornece pagador. S3 guarda remessas, retornos e documentos.

## Mudanca segura

Executar validadores de calculo, CNAB e retorno; testar idempotencia, homologacao, permissao, titulo liquidado/cancelado e conciliacao.
