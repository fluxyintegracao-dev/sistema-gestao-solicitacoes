# DDA Banco do Brasil

## Objetivo

O modulo DDA organiza os boletos eletronicamente apresentados pelo Banco do Brasil e permite conferir se cada documento corresponde a um titulo financeiro a pagar ja existente no Fluxy.

Esta primeira versao cria a estrutura interna, a seguranca, a auditoria, o processo de matching e a interface operacional. A consulta real ao Banco do Brasil permanece bloqueada ate a configuracao do adapter DDA conforme os endpoints e escopos efetivamente liberados na aplicacao BB que ja esta em producao.

## Limites da primeira versao

- nao cria titulo financeiro automaticamente;
- nao vincula boleto automaticamente, mesmo quando o match e exato;
- nao gera, aprova ou envia pagamento ao banco;
- nao altera o motor existente de Pagamentos em Massa;
- nao considera o DDA prova de pagamento;
- nao executa chamada real ao Banco do Brasil sem homologacao;
- nao armazena credenciais bancarias nas tabelas DDA.

O DDA e uma camada de apresentacao e conferencia de obrigacoes. A liquidacao continua seguindo os controles financeiros e bancarios ja existentes.

## Fluxo operacional

1. O operador acessa **Financeiro > DDA Bancario**.
2. Quando a integracao estiver homologada, solicita a sincronizacao conforme seu escopo de empresa e conta.
3. O backend normaliza cada documento, calcula uma impressao digital e impede duplicacao por provider e identificador externo.
4. O sistema procura um titulo a pagar ativo.
5. O resultado recebe um dos estados abaixo.
6. Um usuario autorizado confere e confirma o vinculo exato ou realiza um vinculo manual.
7. Divergencias e documentos ignorados permanecem auditaveis.

## Estados do documento

| Estado | Significado | Acao esperada |
| --- | --- | --- |
| `NOVO` | Recebido, ainda sem classificacao conclusiva | Reprocessar |
| `MATCH_EXATO` | Um unico titulo compativel foi encontrado | Confirmar humanamente |
| `AMBIGUO` | Mais de um titulo compativel foi encontrado | Escolher manualmente |
| `DIVERGENTE` | Identificador coincide, mas valor ou vencimento diverge | Conferir e decidir |
| `SEM_TITULO` | Nenhum titulo elegivel foi encontrado | Cadastrar/conferir titulo e reprocessar |
| `VINCULADO` | Vinculo com titulo confirmado | Consultar auditoria |
| `IGNORADO` | Documento retirado da fila com justificativa | Consultar auditoria ou reprocessar |

## Regras de matching

O matching segue ordem deterministica:

1. linha digitavel ou codigo de barras exatos;
2. na ausencia de identificador compativel: CPF/CNPJ do beneficiario, valor atual, vencimento e empresa exatos;
3. um candidato gera `MATCH_EXATO`;
4. mais de um candidato gera `AMBIGUO`;
5. identificador unico com valor ou vencimento divergente gera `DIVERGENTE`;
6. nenhum candidato gera `SEM_TITULO`.

Somente titulos `PAGAR` com status `ABERTO`, `PARCIAL` ou `PENDENTE` participam. Um `MATCH_EXATO` continua sendo apenas uma sugestao: o vinculo exige acao humana e permissao granular.

## Persistencia e rastreabilidade

- `financeiro_dda_sincronizacoes`: tentativa, periodo, provider, conta, totais e erro da sincronizacao;
- `financeiro_dda_boletos`: documento normalizado, payload original, hash, estado e vinculos;
- `financeiro_dda_eventos`: trilha append-only de recebimento, atualizacao, matching, vinculo, bloqueio e ignorado.

A chave `provider + provider_document_id` e unica. O fingerprint permite detectar o mesmo documento quando a representacao externa variar. Alteracoes de vinculo usam transacao e bloqueio pessimista para evitar confirmacoes simultaneas.

## Permissoes

| Permissao | Finalidade |
| --- | --- |
| `financeiro.dda.visualizar` | Consultar resumo e documentos |
| `financeiro.dda.sincronizar` | Solicitar sincronizacao quando homologada |
| `financeiro.dda.vincular` | Confirmar sugestao ou vincular manualmente |
| `financeiro.dda.ignorar` | Ignorar com justificativa |
| `financeiro.dda.auditar` | Consultar sincronizacoes e eventos |
| `financeiro.dda.configurar` | Reservada para configuracao futura de provider e escopos |

## Endpoints

- `GET /api/financeiro/dda/resumo`
- `GET /api/financeiro/dda/boletos`
- `GET /api/financeiro/dda/boletos/:id`
- `GET /api/financeiro/dda/boletos/:id/candidatos`
- `GET /api/financeiro/dda/sincronizacoes`
- `POST /api/financeiro/dda/sincronizar`
- `POST /api/financeiro/dda/boletos/:id/reprocessar-match`
- `POST /api/financeiro/dda/boletos/:id/vincular`
- `POST /api/financeiro/dda/boletos/:id/confirmar-sugestao`
- `POST /api/financeiro/dda/boletos/:id/ignorar`

Enquanto o adapter DDA nao estiver configurado, `POST /sincronizar` registra a tentativa bloqueada e responde `503` com o codigo legado `BB_DDA_NAO_HOMOLOGADO`. O codigo foi preservado para manter compatibilidade com a interface e os testes, mas nao significa que seja necessaria uma nova aplicacao no Portal Developers BB.

## Aplicacao e credenciais do Banco do Brasil

Decisao confirmada para o Fluxy: **Pix, Pagamentos em Lote e a consulta relacionada ao DDA usam a mesma aplicacao Banco do Brasil que ja esta em producao**. Nao sera criada uma segunda aplicacao para o DDA.

A identidade da aplicacao, `client_id`, `client_secret`, `app_key` e certificado mTLS podem, portanto, ser os mesmos ja homologados. O backend nao deve copiar esses segredos para novas tabelas nem exigir um segundo cadastro de aplicacao.

A separacao obrigatoria ocorre dentro do codigo e da operacao do Fluxy:

- Pix e Pagamentos em Lote preservam seus providers, endpoints e regras atuais;
- DDA possui adapter, endpoint base, escopos, permissoes, logs, rate limit e auditoria proprios;
- o adapter DDA pode reutilizar a identidade e o material mTLS da aplicacao existente, sem misturar chamadas ou payloads com o motor de pagamentos;
- nenhuma resposta DDA autoriza, aprova ou envia pagamento;
- falha ou indisponibilidade do DDA nao pode bloquear Pix nem Pagamentos em Lote;
- segredos permanecem exclusivamente no backend e nunca sao persistidos nas tabelas DDA.

A referencia funcional informada para essa contratacao e a API 23 do Portal Developers BB: <https://apoio.developers.bb.com.br/apis/23?versaoApi=1&topico=18886905>.

## Checklist para habilitar a consulta real

1. confirmar na aplicacao BB existente os endpoints e escopos da API 23 liberados para o convenio ativo;
2. manter a mesma identidade da aplicacao e o mesmo material mTLS ja homologado;
3. cadastrar somente a configuracao operacional especifica do DDA no backend, sem duplicar segredos;
4. implementar o adapter DDA conforme o contrato oficial efetivamente liberado;
5. garantir allowlist independente para os hosts do DDA e impedir chamadas a endpoints de pagamento pelo adapter de consulta;
6. validar sandbox/homologacao sem gerar pagamentos;
7. executar `npm run test:dda` e os testes de Pagamentos em Massa para comprovar isolamento e ausencia de regressao;
8. liberar as permissoes DDA somente aos usuarios responsaveis;
9. habilitar producao de forma gradual, com logs e reconciliacao dos totais.

## Smoke test

1. usuario sem permissao DDA nao ve o menu e recebe bloqueio na API;
2. usuario apenas com visualizacao consulta a fila, mas nao vincula nem ignora;
3. sincronizacao sem homologacao retorna `BB_DDA_NAO_HOMOLOGADO` e gera auditoria;
4. documento repetido nao cria duplicata;
5. match exato nao vincula antes da confirmacao;
6. dois candidatos produzem `AMBIGUO`;
7. valor ou vencimento divergente produz `DIVERGENTE`;
8. vinculo manual rejeita titulo de outra empresa;
9. dois cliques simultaneos nao vinculam o mesmo documento a titulos diferentes;
10. vinculo copia linha digitavel/codigo de barras somente quando o titulo nao os possui;
11. ignorar exige justificativa;
12. nenhuma operacao DDA gera ou envia lote de pagamento.
