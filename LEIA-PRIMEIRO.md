# LEIA PRIMEIRO — Fluxy V4

**Ponto de entrada do projeto.** Se você está retomando, comece por aqui: este arquivo diz
onde paramos, o que fazer a seguir e qual documento consultar para cada assunto.

Última atualização: **23/08/2026**

---

## 1. O projeto em um parágrafo

Cópia local e isolada do sistema Fluxy (construtora CSC), usada para executar um escopo de
alterações pedido pela empresa e reelaborar o frontend. O sistema está **em produção e em uso
real** — a empresa pediu as mudanças justamente para extrair mais do que ele já entrega.
Por isso o padrão é alto: nada entra sem mapa de impacto, teste e auditoria independente.

---

## 2. Onde paramos — estado exato

Última sessão: **23/08/2026**. O fluxo de contratos está **completo do banco à tela**; o que
falta é auditoria e polimento, não construção.

### O lote de 32 itens (23/08) — 3 das 6 fases entregues

O cliente trouxe um lote de mudanças que foi organizado em `PLANO-IMPLANTACAO-2026-08-23.md`,
aprovado por ele e está sendo executado fase a fase.

| Fase | O que é | Estado |
|---|---|---|
| 1 — Cadastro do credor | nome fantasia e representante legal na PJ | ✅ entregue (suíte 40) |
| 2 — Abertura do contrato | subtipo fora, valor antes, parcelas manuais, negociação em todo contrato | ✅ entregue (suíte 41) |
| 3 — Medição | favorecido e dados de pagamento na medição, formas configuráveis, anexo com dono, aprovação → `LIBERADO` | ✅ entregue (suíte 42) |
| **33** (fora do plano) | o valor pago na baixa vira o valor da parcela | ✅ entregue (suíte 43) |
| 4 — Tela de detalhe | Status e Apropriação fora do cabeçalho, Objeto ao lado do número, comentar e anexar num ato só, justificativa no histórico | ✅ entregue (suítes 39 e 44) |
| 5 — Fluxo e status | aprovado/rejeitado volta ao setor de quem criou; aditivo com Aprovar, Rejeitar e Cancelar | ✅ entregue (suítes 45 e 46) |
| **31** — permissões dos botões | `contratos.fluxo.reenviar`: criar contrato deixou de valer como tramitar o dos outros | ✅ entregue (suítes 31 e 32) |
| 6 — Financeiro e relatórios | alerta de saldo em 3 níveis com tela de configuração, e os arquivos na linha do relatório | ✅ entregue (suítes 47 e 48) |
| **Título do contrato sem solicitação** | achado pela suíte 48; corrigido, com script de dados à parte | ✅ entregue |

**As 6 fases do lote de 23/08 estão entregues.** Bateria: **46 suítes, todas passando**.

⚠️ **Antes de migrar para produção, leia a seção de SCRIPTS DE DADOS do `MIGRACAO-PARA-PRODUCAO.md`.**
Migration não altera dados (regra de 24/08): há **quatro** scripts que precisam ser rodados à mão
depois do deploy, ou colunas novas ficam vazias nos registros antigos.

Regressão: **bateria 03 a 42 rodada inteira em 23/08, todas passando.** Nada commitado.

Duas coisas ficaram **em aberto para o cliente decidir**, ambas de uma linha:

- **Status de título pago com parcela ainda por medir.** Com `APROVADA` fora do fluxo de contrato,
  está voltando para `NEC. DE MEDIÇÃO` (mapa da Fase 3, §7.5).
- **Item 32** — o `limit: 50` que trunca em silêncio a aba Arquivos da obra.

### Visão de uma olhada

| Frente | Estado |
|---|---|
| **Wireframe 1 — criação de contrato** dentro da Nova Solicitação | ✅ completo · **auditado e APROVADO** (2ª rodada) |
| **Wireframe 2 — Medição** com saldo do contrato | ✅ completo (backend + tela) · ⏳ **não auditado** |
| **Máquina de estados com o JURÍDICO** (acima do limite) | ✅ completo · ⏳ não auditado |
| **Encerrar contrato** (quebra de contrato) | ✅ backend + botão na Gestão de Contratos · ⏳ não auditado |
| **Campos por subtipo** (motor + tela de configuração) | ✅ completo · ⏳ não auditado |
| **Campos do escopo 3.1/3.2** (objeto, vigências, justificativa, responsável, contratados múltiplos, favorecido) | ✅ completo · ⏳ não auditado |
| **Termo aditivo** — botão + modal na medição, **legado e fluxo novo** | ✅ completo · ⏳ não auditado |
| **Abertura única** de contrato (subtipo só ABERTURA) | ✅ completo · ⏳ não auditado |
| **Auditoria independente** de tudo acima | ⏸️ **aguardando autorização do cliente** |

### O fluxo, em uma passada

1. **Criação** (Nova Solicitação, tipo com `usa_fluxo_contrato_novo`, subtipo **ABERTURA DE
   CONTRATO** — o único que existe, PI-14): o **título** vira a
   referência do contrato; objeto, justificativa, responsável, vigências; contratados (vários) e
   favorecido do pagamento (pode ser terceiro); categoria, condição e parcelas (teto **24**).
   Nasce `AGUARDANDO_APROVACAO`, **sem título financeiro**.
2. **Aprovação da Gerência de Processos**: abaixo do limite vai direto a `ATIVO` e as parcelas
   viram títulos; a partir do limite segue para `EM_ANALISE_JURIDICA`.
3. **Jurídico** (acima do limite): `minuta` → `AGUARDANDO_ASSINATURA`; `assinado` → `ATIVO`, e
   **só aqui** nascem os títulos. Permissão própria `contratos.juridico.tramitar`.
4. **Medição** (tipo MEDIÇÃO + contrato do fluxo novo): consome parcelas existentes na **ordem
   do vencimento**, respeitando o **saldo do contrato** (total − comprometido). Medir menos
   reduz a parcela e joga a diferença na última; o título acompanha.
5. **Termo aditivo** (PI-15): pedido por um **botão na tela de medição**, que abre um **modal**,
   e vale para contrato do fluxo **antigo e novo**. Teto de **25% do valor original**, acumulando
   aprovados; rejeitado libera de volta. Só a aprovação altera o contrato — e, no legado, é ela
   que faz o saldo subir (`valor_total + ajuste_solicitado + valor_aditivos`). Pedir o aditivo
   **não** envia a medição em curso: são dois atos separados.
6. **Encerramento**: zera o saldo, exclui títulos em aberto, e o parcialmente pago fecha pelo
   valor já pago.

### O que é configuração, não código

| O quê | Onde |
|---|---|
| Limite que manda o contrato ao Jurídico | chave `CONTRATO_LIMITE_JURIDICO` (padrão R$ 50.000) |
| Campos visíveis/obrigatórios **por tipo e por subtipo** | tela de campos da Nova Solicitação, chave `tipo:subtipo` |
| Categorias de contrato liberadas | tela Categorias do Contrato de Obra |
| Tipos por setor | tela Tipos de Solicitação por Setor |
| Subtipos de contrato | cadastro em `tipos_sub_contrato` — hoje **só `ABERTURA DE CONTRATO`** está ativo (PI-14) |

### As regras do cliente vivem em documento próprio

`POLITICA-INTERNA-CSC.md` guarda **PI-1 a PI-13** — as regras internas da empresa, que não dá
para deduzir do código nem do banco. **Conferir antes de codar qualquer fluxo.** Foi criado
depois de eu implementar uma regra errada por presumir.

### Suítes de QA — o que cada uma prova

Re-executáveis com o ambiente no ar: `node qa/<caminho>`.

| Suíte | Prova |
|---|---|
| `integracao-d38/01-fluxo-completo.js` | criação de contrato pela tela, ponta a ponta, com os campos do escopo |
| `integracao-d38/03-regressao-solicitacao-padrao.js` | o fluxo padrão de solicitação segue intacto |
| `medicao/01-baseline-legado.js` | baseline da medição legada (`QA_FASE=depois` para comparar) |
| `medicao/03-fundacao.js` | rota de parcelas, MD-2, MD-4, guardas de estado |
| `medicao/04-nucleo-md6-md8.js` | aritmética da medição em centavos e erros forçados |
| `medicao/05-nenhum-contrato-nasce-aprovado.js` | guarda de regressão: nenhum contrato nasce aprovado |
| `medicao/06-titulo-acompanha-parcela.js` | título segue a parcela; previsto imutável |
| `medicao/07-saldo-e-edicao.js` | saldo governa a medição; quitado/parcial fechados |
| `medicao/08-devolucao-e-encerramento.js` | título excluído devolve saldo; encerramento |
| `medicao/09-tela-medicao.js` | bloco de medição na tela e gravação pelo caminho real |
| `medicao/10-fluxo-juridico.js` | máquina de estados do Jurídico |
| `medicao/11-campos-por-subtipo.js` | precedência da regra de subtipo (motor) |
| `medicao/12-tela-campos-por-subtipo.js` | a tela grava sob `tipo:subtipo` |
| `medicao/13-favorecido-e-contratados.js` | contratados múltiplos e favorecido |
| `medicao/14-termo-aditivo.js` | teto de 25% acumulado e devolução na rejeição |
| `medicao/15-tela-aditivo.js` | o botão e o modal do aditivo na medição, num contrato do fluxo novo |
| `medicao/16-aditivo-contrato-legado.js` | aditivo em contrato **legado**: teto de 25%, aprovação e o saldo legado refletindo |
| `medicao/17-abertura-unica.js` | abertura única, subtipos desativados recusados, e o valor decidindo o fluxo |
| `medicao/18-contrato-como-solicitacao.js` | o contrato vive na solicitação; categoria exigida na aprovação nos dois caminhos |
| `medicao/19-medicao-sem-solicitacao.js` | medição do fluxo novo altera a solicitação do contrato, sem abrir outra |
| `medicao/20-tela-fluxo-do-contrato.js` | o fluxo do contrato roda pela tela, da aprovação à assinatura |
| `medicao/21-previsoes-e-modal-medicao.js` | previsões no card do Financeiro e o modal por título |
| `medicao/22-rateio-apropriacao-contrato.js` | rateio da apropriação por % e por R$, fechando em cada parcela |
| `medicao/23-apropriacoes-do-contrato.js` | o rateio do contrato lido e editado na solicitação, com motivo, travando depois dos títulos |
| `medicao/24-cadastro-credor-contrato.js` | conferência do cadastro do contratado e a rota estreita que corrige só endereço e CPF/CNPJ |
| `medicao/25-anexo-negociacao.js` | negociação detalhada obrigatória acima do limite, com macro e objeto embutido barrados |
| `medicao/26-tela-abertura-acima-do-limite.js` | o caminho inteiro **pela tela**: documento, conferência, correção do cadastro e criação |
| `medicao/27-anexo-negociacao-por-quem-abre.js` | quem abre o contrato anexa a negociação dele, e só enquanto ele está sendo montado |
| `medicao/28-historico-do-contrato.js` | cada passo do contrato deixa rastro no histórico da solicitação |
| `medicao/29-minuta-arquivo-e-link.js` | a minuta exige documento ou link, e valida o endereço |
| `medicao/30-visibilidade-do-juridico.js` | o Jurídico continua vendo a solicitação depois da minuta |
| `medicao/31-rejeicao-e-reenvio.js` | as duas etapas devolvem o contrato, e o reenvio volta para quem devolveu |
| `medicao/32-acoes-por-permissao.js` | a barra de ações só oferece o que a pessoa pode fazer, com três usuários reais na tela |
| `medicao/33-medicao-edicao-e-status.js` | medição sem campos alheios, editável com cascata, e o status da solicitação acompanhando o contrato |
| `medicao/34-parcela-medida-nao-remede.js` | parcela já medida sai da fila, sem travar as seguintes nem a edição da medição |
| `medicao/35-sobra-na-ultima-parcela.js` | medir a última por menos deixa sobra declarada no contrato, e o encerramento a elimina |
| `medicao/36-saldo-bloqueia-medicao.js` | o saldo bloqueia a medição na criação e na edição, e o aditivo é a porta para aumentar |
| `medicao/37-aditivo-gera-parcela.js` | o aditivo informa se é só de valor ou de vigência, e a aprovação gera a parcela correspondente |
| `medicao/38-prazo-vencido-e-aditivo-de-prazo.js` | prazo vencido bloqueia a medição, e o aditivo de prazo redistribui o saldo que já existe |
| `medicao/39-cabecalho-detalhe.js` | a nova organização do cabeçalho, com Objeto/Contratado/Responsável e ocultos onde não há contrato |
| `medicao/40-cadastro-credor-pf-pj.js` | PJ exige nome fantasia e representante legal; PF e Compras seguem como estavam |
| `medicao/41-abertura-parcelas-manuais.js` | parcelas manuais com trava, subtipo fora, valor antes e negociação em todo contrato |
| `medicao/42-medicao-pagamento-e-aprovacao.js` | a medição exige favorecido, chave PIX, forma e aceite; a aprovação leva a `LIBERADO` e ao Financeiro |
| `medicao/43-valor-pago-volta-para-a-parcela.js` | o valor que o Financeiro pagou na baixa vira o valor da parcela, com cascata, idempotência e estorno |
| `medicao/44-comentario-anexo-e-justificativa.js` | apropriação num lugar só, comentar e anexar num ato só, e a justificativa no histórico |
| `medicao/45-volta-para-o-setor-de-quem-criou.js` | aprovado ou rejeitado, a solicitação vai para o setor de quem criou — e o reenvio a devolve à fila de aprovação |
| `medicao/46-aditivo-aprovar-rejeitar-cancelar.js` | o termo aditivo tem os três desfechos, cada um com sua permissão e seu rastro |
| `medicao/47-alerta-de-saldo-do-contrato.js` | o saldo do contrato tem cor em três níveis, configurável, com padrão que nunca deixa a tela sem alerta |
| `medicao/48-arquivos-no-financeiro-de-obras.js` | a linha do relatório abre os arquivos do pagamento, sem virar caminho lateral para anexo alheio |
| `mfa-policy/06-segredo-ilegivel.js` | segredo TOTP ilegível recusa com motivo, registra evento e **não** libera o acesso |

### Migrations desta fase

`medicao_parcelas` · `contrato_parcelas.valor_previsto` · devolução em `medicao_parcelas` ·
`contratos.favorecido_id` · `contratos.justificativa` · `contrato_aditivos` ·
`contratos.solicitacao_id` · `contrato_medicoes` · `medicao_id` em `anexos`/`historicos` ·
`contrato_anexos.tipo` · `contratos.link_assinatura` · `contratos.rejeitado_na_etapa` ·
`contrato_aditivos.tipo` e `qtde_parcelas` · `parceiros.nome_fantasia` e os sete campos do
representante legal.
Todas registradas em `MIGRACAO-PARA-PRODUCAO.md`.

### Variáveis de ambiente novas (20/08)

`CNPJ_LOOKUP_URL` · `CNPJ_LOOKUP_TIMEOUT_MS` · `UPLOAD_NEGOCIACAO_MAX_MB`. As três têm padrão
seguro; com a primeira vazia, a consulta de CNPJ fica **desligada** e o ambiente segue offline.
Detalhes e o aviso de ligar o `CLAMAV_ENABLED` em produção: `MIGRACAO-PARA-PRODUCAO.md` §3.15.

### Permissões novas (ninguém as tem por padrão, nem administradores)

`contratos.geral.encerrar` · `contratos.medicao.editar_valor` · `contratos.juridico.tramitar` ·
`contratos.solicitacao.cancelar` · `contratos.credor.completar_cadastro`.

---

## 2.1 Pendências — o que fazer a seguir

**Na ordem em que eu faria:**

1. **Auditoria independente** de tudo que não foi auditado (aguarda autorização do cliente).
   Roteiro: caminho real do usuário nas duas trilhas (legado e fluxo novo), erros forçados no
   saldo, nas permissões novas e nas transições fora de ordem, mais o baseline do MD-5.
2. ~~`qa/medicao/15-tela-aditivo.js` não passa.~~ **Resolvido em 18/08.** A suspeita registrada
   (chave da área, por causa do espaço no fim do nome do setor) **estava errada** — os dois lados
   da cascata fazem `.trim()`. A suíte estava certa: ela apontava **dois defeitos de produto**,
   descritos em `MAPA-IMPACTO-SUBTIPO-NA-TELA.md` e corrigidos.
3. **Não existe tela de aprovação nem de listagem do termo aditivo.** A rota
   `/contratos/aditivos/:id/decisao` funciona e está provada, mas **sem interface**: hoje a
   aprovação só roda por serviço. Enquanto isso, status, motivo da rejeição, justificativa e
   responsável do aditivo não são visíveis em lugar nenhum. **Quando essa tela existir, decidir
   junto o campo Responsável** — o cliente perguntou se ele é necessário (19/08) e a decisão foi
   *manter por ora*, justamente porque falta a tela que o consumiria. Ver seção 11 de
   `MAPA-IMPACTO-ADITIVO-E-SUBTIPOS.md`.
4. **Layout dos blocos de medição e aditivo**: receberam menos cuidado que o do contrato, que
   foi reorganizado em seções (o quê → quem → como paga). Mesmo tratamento resolveria. (O rótulo
   “Título do contrato” na trilha do aditivo deixou de existir: o aditivo saiu do formulário e
   virou modal.)
5. **Confirmar com o cliente** duas coisas registradas nos mapas: a regra de **sobreposição de
   período** hoje vale só para o fluxo novo (o banco tem **375 pares sobrepostos** no legado, e
   bloquear quebraria prática corrente); e a fronteira exata de R$ 50.000 (hoje `<` manda para
   aprovação manual).

**Herdadas, fora deste bloco de trabalho:**

- `qa/integracao-d38/02-correcoes-auditoria.js` falha em `Cannot read properties of null
  (reading 'focus')` — a linha da parcela não existe quando a quantidade volta de 999 para 3.
  **Confirmado anterior a 19/08** por experimento controlado (código original + subtipos
  reativados: falha idêntica). Não está na lista de suítes vigentes
- MÉDIA da rejeição: contrato sem parcelas aceita rejeitar (aprovar dá 409)
- F10: valor acima do teto do `DECIMAL(12,2)` responde 500 genérico em vez de 400
- Comparador de `qa/contratos-aprovacao-v3/09` não desce em arrays aninhados (falso-ALTA em DRE)
- Confirmar se `isBusinessAdmin` reconhece `ADMINISTRADOR` e não `ADMIN` (14 usuários ativos com
  perfil `ADMIN`; o cliente vai migrá-los para USUARIO em produção)

---

## 2.2 Armadilhas do ambiente (custaram tempo — não repetir)

- **Dois cadastros diferentes com o MESMO nome.** O subtipo `ABERTURA DE CONTRATO` (25) tem o
  mesmo nome do **tipo de solicitação 2** (o do fluxo antigo). Teste que escolhe varrendo todos os
  `<select>` até achar a opção acerta o seletor de **tipo**, troca o tipo inteiro e o formulário
  muda sem erro nenhum. **Mirar o `name` do campo** (`select[name="tipo_sub_id"]`), nunca varrer.
- **A chave da área é o CÓDIGO do setor, não o nome.** `setores.codigo='GEO'`, mas
  `setores.nome='GERENCIA DE PROCESSOS '`. As duas telas usam o código como `value` do `<option>`,
  e é ele que vai para `NOVA_SOLICITACAO_CAMPOS_POR_TIPO`. Teste que grava configuração à mão pelo
  nome não é encontrado pela cascata — custou a suíte 15 inteira. **Gravar pela tela, não por SQL.**
- **Setor com espaço no fim do nome** no banco (`GERENCIA DE PROCESSOS ` com espaço). A resolução
  por nome é exata: integração que mande o nome não encontra. A tela não sofre porque envia o id.
  **Cuidado:** isto é real, mas já foi acusado uma vez de ser a causa de um bug que era outro —
  a cascata de campos faz `.trim().toUpperCase()` dos dois lados, então ali o espaço não importa.
- **Teste de tela sem tratador de diálogo**: o `alert` trava a página e o print seguinte estoura
  o timeout do protocolo, sem mensagem clara. Sempre registrar `page.on('dialog', ...)`.
- **A validação nativa do navegador barra o submit sem disparar diálogo.** A falha aparece como
  “sem alerta e sem registro no banco”, que não diz nada. Antes de clicar em enviar, perguntar ao
  formulário: `form.checkValidity()` e listar os `:invalid` com o rótulo. A suíte 15 faz isso.
- **`node -e` não resolve módulo pelo `chdir`** — usar caminho absoluto no `require`.
- **O modelo de título esconde os excluídos** por escopo padrão: usar `TituloFinanceiro.unscoped()`
  para vê-los depois da exclusão.
- **Anexo `.txt` não é tipo aceito** (`config/uploadComprovantes`): usar PDF nos testes.
- **Limpeza de QA precisa cobrir o disco**, não só o banco: contrato com anexo deixa arquivo em
  `backend/uploads/contratos/<codigo>/`.
- **Seletor de teste por posição quebra a cada mudança de layout** — mirar por rótulo.
- **O histórico é estrutura de dados da VISIBILIDADE, não só registro.** A regra "passou pelo meu
  setor" casa o TEXTO de `historicos` com `LIKE 'DE <SETOR> PARA %'` / `'% PARA <SETOR>'` e com
  `h.setor`. Escrever uma frase equivalente ("Encaminhada de X para Y.") quebra a visibilidade **sem
  erro nenhum**: o Jurídico perdeu a solicitação de vista assim. Formato obrigatório: `De X para Y`,
  sem ponto, `setor` = destino.
- **Status terminal que ninguém lê como ponto de partida vira beco sem saída.** `REJEITADO` era
  escrito na rejeição e não aparecia em nenhuma transição de saída: o responsável corrigia e não
  havia como devolver o contrato para a fila. Ao criar um status, procurar por ele **como origem**,
  não só como destino.
- **Espelhar o status na solicitação não é o mesmo que devolvê-la.** `REJEITADO` mudava
  `status_global` para `PENDENTE DE AJUSTE` e deixava `area_responsavel` intacta — o Jurídico
  devolvia e a solicitação **ficava com o Jurídico**. Quem tinha de corrigir não a via na fila, e o
  motivo ficava numa tela que ele não abria. Toda mudança de estado responde a duas perguntas: em
  que situação a solicitação fica, e **com quem** ela fica.
- **Tela que decide por STATUS não decide por PERMISSÃO.** `AcoesContrato` oferecia Aprovar, Minuta
  pronta e Conferido a qualquer um que enxergasse a solicitação — o usuário da obra viu o bloco do
  Jurídico. O backend recusava com 403, então nada foi executado indevidamente; o defeito é a tela
  **prometer**, e a pessoa descobrir depois de anexar arquivo e clicar. Quem decide o que oferecer é
  a resposta do backend (`contrato.permissoes`), calculada pelas **mesmas funções** que as rotas usam
  para recusar. Campo ausente = negado, nunca liberado.
- **Antes de aplicar permissão por união, AUDITE o que a pessoa já tem.** União só acrescenta — e
  por isso preserva o erro que já existia. Relatei "joão 27 → 32" sem olhar as 27, e nelas estavam
  `contratos.juridico.tramitar` e `contratos.aprovacao.aprovar` num usuário de OBRA, desde junho.
- **Fechar a tela pela permissão certa EXPÕE quem não tinha dono.** Ao gatilhar os blocos, a etapa
  `assinado` (Solicitar revisão) sumiu para o setor de origem — ela exigia a permissão do Jurídico, e
  quem colhe a assinatura é a origem. Enquanto tudo aparecia para todos, ninguém esbarrava nisso. Ao
  restringir uma tela, percorra cada estado perguntando **quem tem o trabalho em mãos ali**.
- **Campo que o backend DESCARTA não deve estar na tela — e tirar da tela não basta.** A medição do
  fluxo novo não cria solicitação (PI-16): Valor, Descrição, Vencimento e o rateio de apropriação
  eram preenchidos, validados e jogados fora. As validações de obrigatoriedade rodam **antes** da
  interceptação, então esconder só na tela transformaria toda medição num 400. Quando uma exigência
  sai, procure a checagem antiga: já tornei impossível criar contrato acima do limite exatamente
  assim.
- **Suíte que preenche um campo está atestando que ele precisa existir.** A 09 preenchia os quatro
  campos inúteis e por isso nunca perceberia que não serviam para nada. Teste de tela deve afirmar
  também o que **não** deve aparecer.
- **"Existe título em aberto" não é o mesmo que "há medição a pagar".** No fluxo novo todas as
  parcelas viram título na **aprovação do contrato**, não na medição — a primeira versão do status
  deixaria a solicitação em `NEC. DE MEDIÇÃO` desde a aprovação e para sempre. E parcela zerada por
  uma redistribuição não é "por medir": contá-la travaria o contrato em `APROVADA` eternamente.
- **Redistribuição que recusa em vez de cascatear trava o caso legítimo.** A diferença da medição ia
  para a última parcela e o sistema **recusava** se ela não comportasse, mesmo com saldo de sobra nas
  anteriores. A regra do cliente é cascata: consumiu a última inteira, continua na penúltima.
- **`editavel` não responde "pode medir?".** Ele olha o status do TÍTULO, e o título de uma parcela
  medida segue `ABERTO` até o pagamento — então a mesma parcela podia ser medida duas vezes,
  comprometendo o contrato duas vezes pela mesma linha. São perguntas diferentes e viraram campos
  diferentes: `editavel` (aceita alteração) e `medivel` (pode entrar numa medição **nova**). Fundir
  os dois quebraria a edição da própria medição, que precisa alterar uma parcela já medida.
- **O destino de uma redistribuição não pode ser trabalho de outra medição.** A diferença ia para "a
  última parcela editável", que podia ser uma parcela já medida: o valor dela mudava e o
  `valor_medido` gravado não — a medição passava a dizer um número e a parcela outro.
- **`alert` nativo trava a página inteira para o Puppeteer.** Sem um `page.on('dialog')` que aceite,
  todo `evaluate` seguinte fica pendurado até o `protocolTimeout` (180s), e o erro que aparece —
  `Runtime.callFunctionOn timed out` — não menciona a caixa aberta. Suíte de tela sempre registra o
  handler antes de navegar.
- **`networkidle2` não acontece em página logada.** A conexão de atualizações ao vivo fica aberta, e
  o `goto` estoura o tempo com a tela pronta. Depois do login, esperar pelo elemento, não pela rede.
- **A obra 23 é `ED. PEDRA MENINA`.** Os contratos das suítes nascem nela; digitar outro nome no
  campo de obra faz a busca por referência não achar nada — e o alerta que ela abre trava a página
  (armadilha acima).
- **Invariante só é útil se a exceção for DECLARADA.** A soma das parcelas tem de fechar com o
  contratado (MD-7), mas medir a última parcela livre por menos deixa uma sobra legítima. A checagem
  virou `totalDepois === totalAntes − sobra`, com a sobra somada explicitamente pela redistribuição —
  qualquer outro centavo que suma continua sendo erro 500. Afrouxar a checagem para `<=` teria
  escondido bug de cálculo junto.
- **Devolver e buscar não são o mesmo caso.** Diferença positiva (mediu menos) sem destino vira
  sobra; diferença negativa (mediu mais) sem origem continua erro — senão o sistema inventaria
  dinheiro que o contrato não tem.
- **Corrigir metade do caminho é pior do que não corrigir.** Fechei os destinos da redistribuição na
  CRIAÇÃO da medição e deixei a EDIÇÃO excluindo só as parcelas da própria medição: as de outras
  medições continuavam recebendo a diferença. Ao corrigir um caminho, procure os irmãos dele.
- **Contrato encerrado não tem saldo.** `valor_total − comprometido` não muda no encerramento, e a
  tela seguia exibindo saldo num contrato que não recebe mais nada. Contratado e comprometido
  continuam reais para relatório; o que zera é o que ainda se pode gastar.
- **Garantia "por consequência" não é garantia.** A edição da medição nunca passava do saldo porque
  aumentar tirava de outras parcelas — resultado certo, intenção não escrita. Uma mudança na
  redistribuição derrubaria isso em silêncio. Regra que o cliente nomeia vira **guarda explícita**,
  com a mesma conta nos dois caminhos.
- **Ao conferir saldo numa EDIÇÃO, desconte o que o próprio registro já compromete.** Sem isso a
  medição concorre consigo mesma: o valor dela é contado duas vezes e qualquer aumento é recusado.
- **Saldo aberto sem parcela é dinheiro inalcançável.** O aditivo aprovado subia `valor_aditivos` e
  não criava linha nenhuma — e parcela é o que se mede. Corrigido em 21/08: a aprovação materializa
  o valor em parcela, conforme o `tipo` declarado no pedido. Ao abrir saldo em qualquer lugar,
  pergunte por onde ele é consumido.
- **Radio no Puppeteer precisa de `click()`, não de `value`.** Setar o `value` de um
  `input[type=radio]` não dispara o que o React escuta, e a suíte reprova com o campo "vazio".
- **Recusa que não diz o caminho vira chamado de suporte.** "Passa do saldo do contrato" informa;
  "solicite um termo aditivo" resolve.
- **Parcela zerada continua sendo "parcela livre".** Zerar em vez de remover deixa uma linha de
  R$ 0,00 que toda consulta de "o que falta medir" conta, e que aparece na tela sem servir para nada.
  Parcela sem medição e sem pagamento pode ser removida; o título vai a `EXCLUIDO` antes, com motivo.
- **`vigencia_fim` existia e ninguém lia.** Contrato vencido aceitava medição em silêncio. Campo
  gravado que nenhuma regra consulta é uma regra que você acha que tem e não tem — ao criar um campo
  de prazo ou limite, procure quem o lê.
- **Ao atualizar o contrato antes de derivar datas, guarde o valor ANTIGO.** `contrato.update()` já
  tinha trocado `vigencia_fim` quando as parcelas do novo prazo eram calculadas, e todas nasceriam em
  cima do fim novo.
- **Largura de ladrilho vai na PROPRIEDADE, não em `:nth-child`.** Metade dos campos do cabeçalho só
  aparece quando há contrato; regra de CSS por posição se desalinha sozinha na primeira solicitação
  de compra.
- **Campo que existe no banco e nunca chegou à tela.** `contratos.objeto`, `responsavel_id` e
  `contrato_credores` estavam preenchidos e invisíveis. Antes de dizer que um dado não existe,
  confira se ele só não está sendo pedido — é a mesma armadilha da lista de `attributes`.
- **`contratos.ref_contrato` é o TÍTULO no fluxo novo.** `NovaSolicitacao` envia
  `ref_contrato: form.descricao`, e o campo se chama "Título do contrato" desde 18/08 — é por ele que
  a Medição procura o contrato. A coluna manteve o nome antigo; a tela não deve. No contrato
  **legado** o nome antigo está certo, e ali continua "Ref. do contrato".
- **`parceiros.tipo_pessoa` guarda `'J'` e `'F'`, não `'PJ'`/`'PF'`.** Comparar com `'PJ'` deixa a
  guarda sempre falsa e a regra **nunca dispara** — sem erro nenhum, só passando batido.
- **Limpeza de QA por NOME não basta quando a prova cria pelo documento.** Uma criação que deveria
  falhar e passa deixa o CNPJ ocupado, e as provas seguintes falham por "já existe" — escondendo o
  defeito real atrás de um sintoma. Limpar pela chave única que a prova usa.
- **Mudar regra de aprovação quebra TODA suíte que aprova para provar outra coisa.** Exigir a
  negociação em todo contrato derrubou 18 de uma vez. O documento vira fixture (`qa/lib/negociacao.js`)
  — menos nas suítes em que o anexo é o objeto do teste, onde a fixture falseia o resultado.
- **Reiniciar o backend depois de mexer no serviço.** As suítes rodam o serviço em processos novos e
  já veem a mudança; o servidor HTTP de longa duração, não. Uma suíte de tela falha com a mensagem
  de uma guarda que você acabou de remover.
- **Código de contrato é REAPROVEITADO** quando a sequência é devolvida. Limpar títulos por
  `CT-XXXX` quase apagou os de um contrato real do cliente; a limpeza tem de exigir também que o
  título esteja órfão.
- **Prova que confere pelo texto da página** quebra quando a página muda por outro motivo. Confira o
  **estado do campo**, não `body.innerText`.
- **`ECONNRESET` numa suíte que espera antes de pedir é keep-alive, não bug do produto.** O Express
  fecha o socket ocioso em 5s; o pool do `fetch` do Node ainda o considera reaproveitável, e a
  primeira requisição depois de uma espera longa volta como erro de transporte, com o backend no ar
  e sem uma linha no log. Repetir **uma vez**, e só para erro de conexão — repetir em cima de
  resposta do servidor esconde o 403 que a suíte existe para medir.
- **Resposta da listagem de solicitações é `{ items, meta }`.** Ler como `data`/`rows` com um
  `|| []` transforma "não reconheci o formato" em "não vê nada" — e a suíte mede o próprio bug.
- **`anexos.tipo` é NOT NULL e o sistema só usa `SOLICITACAO` e `ANEXO`.** Gravar um valor novo
  faz telas e filtros encontrarem algo que não sabem tratar. Papel específico do documento vai no
  metadado, não no `tipo`.
- **Configuração não é cadastro.** `configuracoes_sistema` diz *quais* itens de um cadastro valem
  numa regra; ela nunca é a lista. O campo de categoria financeira lia a configuração da lista
  curada em vez de `categorias_financeiras` (o cadastro do Financeiro) — e ainda por uma rota com
  permissão de Configurações, que quem aprova não tem. Ver `MAPA-BANCO-E-INTEGRACOES.md` §4.
- **Nome de FK gerado pelo Sequelize estoura o limite do MySQL (64).** `references` dentro de
  `addColumn` gera `<tabela>_<coluna>_foreign_idx`; com nome de tabela longo passa de 64 e a
  migration morre com `ER_TOO_LONG_IDENT` — e, como `server.js` roda migrations antes de abrir a
  porta, **o backend não sobe**. Criar a coluna e depois a FK com `addConstraint` e `name` curto.
- **`PERMISSOES_AREAS_USUARIOS` é versionada: inserir SUBSTITUI a configuração de todos.** Uma
  linha de teste esquecida zerou as permissões dos 26 usuários do banco — e, como "nenhuma permissão
  configurada" é tratado como liberado, isso **afrouxou** checagens em vez de só restringir. Usar
  `qa/lib/permissoesConfig.js`, que apaga o id que inseriu e confere que a configuração efetiva
  voltou. Nunca apagar por `id > (máximo de antes)`: com uma linha já vazada, isso apaga a sua e
  deixa a errada mandando.
- **Limpeza de QA devolve o estado; não impõe um.** As suítes zeravam
  `contrato_codigo_sequencias` e isso derrubou a tela do cliente com
  `Duplicate entry 'CT-0001-15'`: o banco é cópia da produção e tem contratos que a suíte não criou.
  Usar `qa/lib/sequenciaContrato.js`, que devolve ao maior código existente. Vale para qualquer
  sequência, contador ou configuração compartilhada.
- **Limpeza que falha tem de reprovar a suíte.** O `finally` só avisava e a suíte seguia dizendo
  PASSOU — foi assim que a sequência ficou fora de lugar sem ninguém ver. Hoje imprime
  `LIMPEZA FALHOU` e zera o exit code.
- **Escolher a permissão pelo que a rota FAZ, e não por quem PRECISA usá-la.** Aconteceu três
  vezes seguidas no bloco de contratos (modal do credor, cadastro, upload da negociação): a guarda
  natural — "mexe em contrato, logo gestão de contratos" — barrava exatamente o usuário da obra, que
  é quem abre o contrato. Antes de escolher a permissão, perguntar **quem vai clicar nisto**.
- **403 pode vir de outra guarda que não a testada.** Rotas de contrato passam por
  `requireContratoAccess` (escopo de obra) antes da permissão. Uma suíte que só confere
  `status === 403` pode estar medindo a guarda errada — asserte a **mensagem**.
- **Suíte que monta o payload no lugar da tela testa o que ela mesma inventou.** Cinco suítes
  mandavam `detalhes_contratacao` por conta própria e por isso nenhuma pegou que a regra antiga
  bloqueava toda criação acima do limite depois que o campo saiu do formulário. Quando um campo sai
  ou entra na tela, **conferir o que as suítes mandam** — e preferir o caminho pela tela
  (`qa/medicao/26-tela-abertura-acima-do-limite.js` é o modelo).
- **`fileFilter` do multer que lança `Error` puro vira 500.** Sem `statusCode`, a recusa de tipo de
  arquivo sai como "Erro interno do servidor" e quem escolheu o arquivo errado acha que o sistema
  quebrou. Usar `UploadSecurityError(msg, 400, codigo)`. Quatro uploads antigos ainda têm o defeito
  (registrado em `MIGRACAO-PARA-PRODUCAO.md` §3.15).
- **Nome de entrada de ZIP está em claro; o conteúdo, não.** Num `.docx` (que é um ZIP), procurar
  por texto de dentro de `[Content_Types].xml` não acha nada — está comprimido com DEFLATE. Os
  **nomes das entradas** (`word/vbaProject.bin`) ficam legíveis, e é por eles que se detecta macro.
- **Lista explícita de `attributes` no Sequelize engole coluna em silêncio.** Consulta com
  `attributes: [...]` devolve o objeto sem a coluna que faltou na lista e sem erro nenhum; o código
  seguinte lê `undefined` e segue. Já derrubou três funcionalidades desta fase (`solicitacao_id`,
  `categoria_financeira_id`, `favorecido_id`). Ao usar um campo novo, conferir a lista antes de
  procurar o defeito em outro lugar.
- **Conferir tela por `document.body.innerText` dá falso negativo.** Já reprovou um cabeçalho que
  estava renderizado e visível. O que vale como prova é o nó (`querySelector`) e o retângulo dele
  (`getBoundingClientRect` + `getComputedStyle`), não o texto do body.
- **Campo sensível não decifra: este banco é cópia da produção, a chave local é outra.** Os 13
  usuários com `mfa_totp_secret` gravado **falham todos** ao decifrar com a `MFA_ENCRYPTION_KEY`
  local, e todos têm MFA ligado — nenhum deles entra neste ambiente. O login agora responde `503`
  com `MFA_SECRET_UNREADABLE` em vez de 500 opaco (ver `MAPA-IMPACTO-MFA-SEGREDO-ILEGIVEL.md`), mas
  destravar de fato é decisão do cliente.
- **Contrato do fluxo novo tem apropriação ativa em poucas obras**: na obra 23 todas as
  apropriações de contratos legados estão inativas; para testar medição legada, escolher o trio
  contrato/obra/apropriação por consulta, não fixo.

---

## 3. Árvore de documentos

### Comece por estes

| Arquivo | O que é |
|---|---|
| **`LEIA-PRIMEIRO.md`** | Este arquivo. Estado, próximo passo e índice. |
| **`PROTOCOLO-AGENTES-PARALELOS.md`** | **Dois agentes trabalham neste repositório** (Contratos e Compras). Banco, backend e alguns arquivos são compartilhados. **Ler antes de rodar suíte ou reiniciar o backend.** |
| **`POLITICA-INTERNA-CSC.md`** | **As regras internas da empresa (PI-1 a PI-20)**, que não dá para deduzir do código nem do banco. **Conferir antes de codar qualquer fluxo.** |
| **`AUDITORIA-FLUXY-VS-V4.md`** | **O que existe em `C:\Fluxy` (dev-v2) e não veio para cá.** Os dois repositórios **não compartilham histórico git** — não há merge possível. Ler antes de trazer qualquer correção. |
| **`CONVENCAO-MIGRATIONS.md`** | **Como numerar migration enquanto `dev-v2` e V4 coexistem.** V4 usa a faixa `0050+`; migration vinda da `dev-v2` nunca é renomeada. **Ler antes de criar migration.** |
| **`QA-ESTADO-COMPARTILHADO.md`** | O que as suítes escrevem em tabelas compartilhadas, o que já quebrou por isso e as regras de limpeza. |
| **`MAPA-BANCO-E-INTEGRACOES.md`** | **De onde cada campo de seleção tira os dados.** As 254 tabelas por área, as fontes canônicas e o checklist de 4 passos. **Ler antes de ligar qualquer campo novo a uma fonte.** |
| **`ALTERACOES-POR-PAGINA.md`** | **As decisões do cliente, D1 a D38**, com o fluxo dos wireframes e o que muda em cada tela. |

### Escopo e planejamento

| Arquivo | O que é |
|---|---|
| `ESCOPO-CONSOLIDADO.md` | Os três `.docx` do cliente cruzados com o código real, por área do sistema. Conflitos entre versões e pendências. |
| `MAPA-DO-SISTEMA.md` | As 194 rotas e 185 páginas reais, por área. Útil para localizar telas. |
| `MAPA-IMPACTO-PARCELAS.md` | Por que as parcelas não são títulos. A varredura das 53 consultas. |

### Mapas de impacto — o raciocínio antes de cada mudança

Escritos **antes** de codar, como manda a regra do projeto. Quem for mexer numa dessas frentes
lê o mapa primeiro: ele traz o que foi verificado no código e no banco, os riscos levantados e
as decisões tomadas com o motivo.

| Arquivo | Frente |
|---|---|
| `MAPA-PADRAO-NOVA-SOLICITACAO.md` | Como a Nova Solicitação funciona e onde o fluxo de contrato encaixou (D38) |
| `MAPA-CORRECAO-D38.md` | Rodada de correção da 1ª auditoria |
| `MAPA-IMPACTO-MEDICAO.md` | Wireframe 2 inteiro: MD-1 a MD-10, saldo, jurídico, encerramento |
| `MAPA-CAMPOS-CONTRATOS.md` | Escopo 3.1–3.3 cruzado com o sistema; campos por subtipo; termo aditivo |
| `MAPA-IMPACTO-SUBTIPO-NA-TELA.md` | Por que a regra de subtipo não chegava à tela e por que o aditivo não podia ser enviado |
| `MAPA-IMPACTO-ADITIVO-E-SUBTIPOS.md` | Abertura única (PI-14) e o aditivo como botão + modal na medição, valendo para o legado (PI-15) |
| `MAPA-IMPACTO-APROVACAO.md` | Etapa 5 (aprovação: parcelas viram títulos) |
| `MAPA-IMPACTO-REJEICAO-E-REENVIO.md` | Devolver nas duas etapas e reenviar para quem devolveu; a solicitação volta ao setor que pediu |
| `MAPA-IMPACTO-ACOES-POR-PERMISSAO.md` | A barra de ações passa a respeitar quem olha; e a etapa da assinatura, que não tinha dono |
| `MAPA-IMPACTO-MEDICAO-AJUSTES.md` | Medição sem valor/título/vencimento próprios, edição com cascata e o status NEC. DE MEDIÇÃO / APROVADA / PAGA |
| `MAPA-IMPACTO-PARCELA-JA-MEDIDA.md` | Por que `editavel` não responde "pode medir?", e o destino da redistribuição que corrompia medição alheia |
| `MAPA-IMPACTO-SOBRA-NA-ULTIMA-PARCELA.md` | Devolução sem destino vira saldo do contrato; contrato encerrado não tem saldo |
| `MAPA-IMPACTO-SALDO-BLOQUEIA-MEDICAO.md` | Saldo bloqueando medição nos dois caminhos, e a lacuna do aditivo que abre saldo sem criar parcela |
| `MAPA-IMPACTO-ADITIVO-GERA-PARCELA.md` | O aditivo declara o que muda (valor ou valor+vigência) e materializa o valor em parcela |
| `MAPA-IMPACTO-PRAZO-ENCERRADO-E-ADITIVO-DE-PRAZO.md` | Vigência vencida bloqueando a medição, e o aditivo de PRAZO — o único sem dinheiro novo |
| `MAPA-IMPACTO-CABECALHO-DETALHE.md` | A nova organização do cabeçalho da solicitação, a partir do esboço do cliente |
| `MAPA-IMPACTO-TITULO-DO-CONTRATO.md` | No fluxo novo, `ref_contrato` é o Título — rótulo de tela, não renomeação de campo |
| `PLANO-IMPLANTACAO-2026-08-23.md` | **O lote de 32 itens em 6 fases.** Ler antes de pegar qualquer item novo. |
| `MAPA-IMPACTO-FASE1-CADASTRO-CREDOR.md` | Fase 1: nome fantasia, representante legal e a regra PF/PJ |
| `MAPA-IMPACTO-FASE2-ABERTURA-CONTRATO.md` | Fase 2: subtipo fora, valor antes, parcelas manuais e negociação em todo contrato |
| `MAPA-IMPACTO-FASE3-MEDICAO.md` | Fase 3: favorecido e dados de pagamento na medição, formas configuráveis, anexo com dono e a aprovação que gera `LIBERADO` |
| `MAPA-IMPACTO-VALOR-PAGO-VOLTA-PARA-A-PARCELA.md` | Item 33: a baixa do Financeiro dá a palavra final sobre quanto a parcela valeu |
| `MAPA-IMPACTO-FASE4-TELA-DE-DETALHE.md` | Fase 4: a mesma informação aparecia três vezes na tela de detalhe |
| `MAPA-IMPACTO-FASE5-FLUXO-E-STATUS.md` | Fase 5: para onde a solicitação volta, o aditivo com os três desfechos, e a **auditoria das permissões dos botões (item 31)** |
| `MAPA-IMPACTO-FASE6-ALERTA-E-RELATORIO.md` | Fase 6: alerta de cor no saldo em três níveis, e os arquivos na linha do Financeiro de Obras |
| `MAPA-IMPACTO-TITULO-DO-CONTRATO-SEM-SOLICITACAO.md` | O título do contrato nascia sem a solicitação dele — levantamento, medição e correção |

### Operação

| Arquivo | O que é |
|---|---|
| `AMBIENTE-LOCAL.md` | Como subir o sistema, credenciais locais, integrações desativadas. |
| `MIGRACAO-PARA-PRODUCAO.md` | Como levar isto a produção sem quebrar. **Variáveis novas, pré-requisitos de deploy e o ensaio já executado.** |
| `PROTOCOLO-QA.md` | Como auditar. **Seção 0: mapa antes de codar.** |
| `MATRIZ-DE-TESTE-FLUXO-DE-CONTRATOS.md` | **Roteiro de teste manual** do fluxo inteiro com Obra, Gerência de Processos e Jurídico — e as permissões granulares de cada um. |

### Evidências

| Caminho | O que é |
|---|---|
| `qa/relatorios/` | Relatórios de auditoria, com veredito e falhas. |
| `qa/evidencias/` | Prints e JSONs de cada auditoria. |
| `qa/baseline/` | Estado do sistema antes das mudanças + comparador de regressão. |
| `qa/medicao/` | Suítes do wireframe 2, campos por subtipo e termo aditivo (tabela na seção 2). |
| `qa/rodar-bateria.js` | Roda a bateria inteira **guardando a saída completa** de cada suíte em `qa/relatorios/bateria/`. |
| `qa/integracao-d38/` | Suítes do wireframe 1 dentro da Nova Solicitação. |
| `qa/auditoria-d38/` · `qa/auditoria-d38-v2/` | Suítes das duas auditorias independentes (registro histórico). |
| `backups/` | Dump pré-migrations e registros removidos. |

---

## 4. Linha do tempo

| # | Marco | Resultado |
|---|---|---|
| 1 | Ambiente local isolado | Zero conexões externas comprovadas. Token do GitHub exposto encontrado e desvinculado. |
| 2 | Processo de migração | Baseado no deploy real (EC2/PM2/Vercel). Baseline de schema fechado: produção e local nas mesmas 165 migrations. |
| 3 | Protocolo de QA | Quem escreve não aprova. Harness de prints com Chrome real. |
| 4 | Baseline do sistema | 19 prints, 127 chaves estáveis, 47 endpoints, comparador automático. |
| 5 | Escopo consolidado | 57 anotações do cliente isoladas por diff; 6 conflitos entre versões levantados. |
| 6 | Apropriação padrão por obra | **Entregue e aprovada.** Reprovada antes por falha silenciosa que apagava configuração. |
| 7 | Estrutura de contratos | 15 colunas, índice único, sequencial `CT-0001`. Reprovada por 2 críticos; corrigida. |
| 8 | Regras de parcelas | Divisão em centavos, datas, redistribuição, aditivo acumulado. Reprovada por 5 falhas; corrigida. |
| 9 | Parcelas em tabela própria | **Redesenho.** Antes: 9 de 27 rotas vazavam. Depois: 0 de 27. |
| 10 | Ensaio de deploy | Migrations testadas sobre cópia de produção. Schema final idêntico ao local. |
| 11 | Permissão sem bypass | SUPERADMIN barrado sem a permissão — a exceção decidida pelo cliente. |
| 12 | Aprovação (etapa 5) | **Entregue e aprovada** na 5ª auditoria (17/08). Reprovada 4 vezes antes: criação direta sem serviço, 6 ALTAS, escopo de obra, janela 0,0001%–0,0049% presa + log morto. |
| 13 | Contrato dentro da Nova Solicitação (D38) | **Entregue e aprovado** na 2ª auditoria (17/08). Reprovado na 1ª por falha silenciosa: anexo descartado sem aviso. |
| 14 | Wireframe 2 — Medição | Saldo do contrato, consumo de parcelas na ordem do vencimento, título acompanhando a parcela, devolução e encerramento. **Não auditado.** |
| 15 | Máquina de estados do Jurídico | Acima do limite o contrato passa por minuta e assinatura, e só aí nascem os títulos. **Não auditada.** |
| 16 | Campos por tipo e subtipo | Motor com precedência + seletor na tela de configuração. **Não auditado.** |
| 17 | Termo aditivo | Teto de 25% acumulado, com devolução na rejeição. Backend e tela provados. |
| 18 | Regra de subtipo chegando à tela | O teste de tela do aditivo pegou **dois defeitos de produto**: o `useMemo` dos campos não declarava `form.tipo_sub_id`, e medição e aditivo não eram exclusivos. **Não auditado.** |
| 19 | Abertura única + aditivo na medição | Subtipos reduzidos a `ABERTURA DE CONTRATO` (PI-14). O termo aditivo virou botão com modal na tela de medição e passou a valer para contrato **legado**, entrando no saldo dele (PI-15). **Não auditado.** |

### O que as auditorias e os testes pegaram

Seis auditorias, quatro reprovações. As falhas mais graves, todas minhas:

- Falha silenciosa apagando configuração sem avisar
- Regressão introduzida ao corrigir a falha anterior
- Premissa errada sobre filtros: 9 de 27 rotas financeiras vazaram
- Arredondamento que eu afirmava ter corrigido, com 961 de 2.001 valores divergindo
- Anexo aceito na tela e descartado sem requisição, sem registro e sem aviso
- Uma vez acusei o sistema de um bug que não existia — o erro era meu

E, na fase de contratos, defeitos que só os **testes** pegaram — todos de dinheiro:

- Medição alterava a parcela e **não** o título: o financeiro seguiria cobrando o valor antigo
- Devolução de saldo somava o valor **duas vezes** na parcela final
- Encerramento **zerava** o título parcialmente pago em vez de fechá-lo pelo valor pago
- Aprovação automática que eu implementei por entender errado uma regra, e que criava títulos
  financeiros no ato da criação do contrato
- A regra de campos **por subtipo** não tinha efeito nenhum na tela: o `useMemo` lia
  `form.tipo_sub_id` sem declará-lo nas dependências. O motor, a tela de configuração e o backend
  resolviam certo — a tela do usuário ignorava. O recurso inteiro estava morto
- O **termo aditivo não podia ser enviado**, em nenhuma circunstância: medição e aditivo não eram
  mutuamente exclusivos, e a guarda da medição rodava antes do ramo do aditivo no submit
- E uma lição sobre diagnóstico: a causa registrada no cabeçalho do teste que falhava **estava
  errada**, e apontava para uma armadilha real (o espaço no nome do setor) que não tinha nada a ver.
  Hipótese anotada não é causa provada

Nenhum chegaria a produção, mas todos teriam chegado sem auditoria e sem teste que confere o
número no banco — não só o status da resposta.

---

## 5. Como subir o ambiente

```bash
cd C:/Users/Ricardo/Documents/Fluxy-V4/backend && node server.js
```

```bash
cd C:/Users/Ricardo/Documents/Fluxy-V4/frontend && npx vite
```

Acesse <http://127.0.0.1:5273> usando as credenciais locais mantidas fora do repositorio.

Detalhes e integrações desativadas em `AMBIENTE-LOCAL.md`.

---

## 6. Regras de trabalho vigentes

1. **Mapa de impacto escrito antes de codar** — toda alteração, sem exceção
2. **Quem escreve não aprova** — auditoria independente com prints e erros forçados
3. **Variável de ambiente nova** é avisada na hora e registrada em `MIGRACAO-PARA-PRODUCAO.md`
4. **Sem remendo** — preferir a solução que elimina a classe do problema
5. **Nunca generalizar a partir de amostra** — foi o que causou as reprovações
6. **Regra do cliente vai para `POLITICA-INTERNA-CSC.md`** antes de virar código, com o efeito
   prático anotado — presumir custou uma implementação inteira que teve de ser revertida
7. **Teste confere o número no banco**, não só o status da resposta. Toda a lista de defeitos da
   seção 4 saiu daí; asserção frouxa já deu falso-positivo mais de uma vez
8. **Limpeza no `finally`**, sempre com `WHERE`, cobrindo banco **e** disco — e conferindo que
   não sobrou nada

---

## 7. Pendências fora do fluxo de contratos

| Assunto | Onde está |
|---|---|
| Token do GitHub exposto (revogar) | `AMBIENTE-LOCAL.md` |
| Cores semânticas todas azuis; `TEMA_SISTEMA` com 10 linhas duplicadas | `ESCOPO-CONSOLIDADO.md`, achados A1/A2 |
| Alertas de vencimento (D23–D27) | `ALTERACOES-POR-PAGINA.md` |
| RH/DP separado; falta definir responsável pela obra (D28–D30) | `ALTERACOES-POR-PAGINA.md` |
| Demais tipos de solicitação | `ESCOPO-CONSOLIDADO.md` |
