# Boletos Caixa - Plano de Homologacao CNAB 240

## Objetivo

Finalizar o add-on `BOLETOS` para operar cobranca Caixa SIGCB com boleto registrado, remessa CNAB 240, retorno CNAB 240, auditoria e pacote de evidencias para solicitar homologacao na agencia.

## Estado atual

Ja existe:

- modulo `BOLETOS` habilitavel e protegido por permissao;
- tela `Financeiro > Boletos`;
- geracao local de boleto Caixa a partir de titulo a receber;
- calculo de fator de vencimento, modulo 10, modulo 11, campo livre, codigo de barras e linha digitavel;
- PDF de boleto/amostra;
- bloqueio de emissao real por `CAIXA_BOLETO_HOMOLOGADO=false`;
- vinculo dos dados de cobranca no `titulos_financeiros`.

Ainda falta:

- cadastro operacional completo do convenio Caixa;
- tabelas proprias de boletos/remessas/retornos/ocorrencias;
- geracao de arquivo de remessa CNAB 240;
- importacao e processamento de retorno CNAB 240;
- baixa financeira por retorno liquidado;
- pacote de homologacao com evidencias e validacoes.

## Fase 1 - Base de dados e governanca

Criar tabelas:

- `boletos_caixa_convenios`
- `boletos_caixa`
- `boletos_caixa_remessas`
- `boletos_caixa_remessa_itens`
- `boletos_caixa_retornos`
- `boletos_caixa_ocorrencias`

Regras:

- boletos ficam vinculados ao titulo financeiro, mas o historico bancario fica no submodulo de boletos;
- remessas e retornos devem ter hash para impedir duplicidade;
- producao continua bloqueada ate homologacao formal;
- dados sensiveis do pagador/beneficiario nao devem ser expostos em logs abertos.

## Fase 2 - Utilitarios CNAB 240

Criar funcoes reutilizaveis para:

- campos numericos com zero a esquerda;
- campos texto com espaco a direita;
- datas `DDMMAAAA`;
- valores em centavos;
- linhas fixas de 240 posicoes;
- validacao de tamanho e caracteres;
- hash de arquivo.

## Fase 3 - Geracao de remessa

Implementar:

- header de arquivo;
- header de lote;
- segmento P;
- segmento Q;
- segmento R quando houver multa/desconto/mensagens;
- segmento S quando houver mensagem impressa;
- trailer de lote;
- trailer de arquivo.

Primeira versao homologavel:

- entrada de titulos registrados;
- emissao pelo beneficiario;
- boleto simples, sem desconto, sem protesto automatico e sem PIX no boleto;
- multa/juros somente se validado com a agencia.

## Fase 4 - Validacao de remessa

Antes de permitir download/envio:

- todas as linhas devem ter 240 caracteres;
- trailers devem bater com quantidade de registros;
- valor total deve bater com a soma dos boletos;
- `nosso_numero` deve ser unico por convenio;
- CPF/CNPJ do pagador deve existir;
- data de vencimento e valor devem estar validos;
- arquivo deve ficar associado a um numero sequencial de remessa.

## Fase 5 - Retorno CNAB 240

Implementar parser de retorno:

- header de arquivo/lote;
- segmento T;
- segmento U;
- trailers;
- motivos de ocorrencia.

O retorno deve atualizar:

- entrada confirmada;
- entrada rejeitada;
- liquidacao;
- baixa;
- tarifas/custas;
- ocorrencias de alteracao.

Baixa financeira:

- somente por ocorrencia de liquidacao confirmada;
- idempotente por retorno/ocorrencia/boleto;
- sem duplicar movimento financeiro.

## Fase 6 - Tela operacional

Adicionar na tela de boletos:

- aba de convenios;
- aba de remessas;
- aba de retornos;
- aba de ocorrencias/rejeicoes;
- download da remessa;
- upload/importacao de retorno;
- resumo de homologacao.

## Fase 7 - Pacote para agencia Caixa

Gerar evidencias:

- arquivo de remessa CNAB 240;
- PDFs/amostras dos boletos;
- relatorio com nosso numero, linha digitavel, codigo de barras, valor, vencimento, pagador e beneficiario;
- resultado da validacao CNAB;
- retorno importado e interpretado quando a Caixa devolver.

## Fase 8 - Conformidade operacional

O FLUXY deve garantir:

- boleto de cobranca em producao somente apos registro/homologacao;
- valor, vencimento, pagador e beneficiario coerentes com o arquivo enviado;
- retorno bancario como fonte de confirmacao de registro/liquidacao;
- trilha de auditoria para geracao, remessa, importacao de retorno e baixa;
- segregacao entre titulo financeiro e eventos bancarios.

## Rollback

As migrations devem ser reversiveis. Como o fluxo atual usa apenas `titulos_financeiros`, criar as novas tabelas nao altera o comportamento atual ate que as rotas/tela de remessa sejam ativadas.
