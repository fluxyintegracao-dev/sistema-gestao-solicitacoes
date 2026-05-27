# LGPD - Classificacao de Dados Core Gateway

## Objetivo

Classificar dados expostos ao FLUXY EXPERIENCE para reduzir risco de vazamento, excesso de exposicao e uso indevido.

## Classes de dados

### Publico

Pode ser exibido no site publico:

- nome comercial do empreendimento;
- descricao comercial aprovada;
- imagens publicas;
- localizacao comercial aproximada;
- tipologias;
- status de disponibilidade publicavel;
- diferenciais;
- conteudo editorial publicado.

### Comercial restrito

Pode ser exibido para corretores, equipe comercial ou CRM Experience com autenticacao:

- lead;
- origem do lead;
- historico comercial;
- funil;
- proposta nao oficial;
- pre-reserva;
- score comercial;
- campanha;
- unidade com informacao comercial detalhada.

### Cliente autenticado

Pode ser exibido no portal do cliente apos autenticacao:

- dados cadastrais resumidos do proprio cliente;
- contratos vinculados ao cliente, em visao resumida;
- parcelas do proprio cliente;
- boletos do proprio cliente por URL temporaria;
- documentos autorizados;
- andamento da obra vinculada;
- chamados do proprio cliente.

### Interno critico

Nao deve ser exposto ao Experience, salvo endpoint especifico, autenticado, auditado e com justificativa:

- dados bancarios completos;
- auditoria completa;
- logs internos;
- documentos internos;
- documentos de outros clientes;
- informacoes financeiras completas do grupo;
- dados de colaboradores;
- dados fiscais sensiveis;
- chaves, tokens e segredos.

## Regras de exposicao

- Expor somente o minimo necessario.
- Sempre usar autenticacao quando houver dado de cliente, corretor ou financeiro.
- Registrar auditoria para acesso documental e financeiro.
- Usar URLs temporarias para documentos.
- Nunca retornar senha, token, chave, path interno ou segredo.
- Tratar CPF/CNPJ com mascaramento quando o caso permitir.

## Dados financeiros para Portal

Permitido:

- resumo de contrato;
- parcelas do proprio cliente;
- status da parcela;
- valor da parcela;
- vencimento;
- link temporario de boleto;
- historico resumido.

Nao permitido:

- saldos bancarios do Core;
- contas internas;
- DRE;
- fluxo de caixa;
- endividamento;
- dados de outros clientes;
- dados intercompany;
- regras internas de baixa.

