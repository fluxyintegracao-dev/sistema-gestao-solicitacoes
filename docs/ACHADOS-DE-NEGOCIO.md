# ACHADOS DE NEGÓCIO — para quem decide, não para quem programa

**Origem:** leva do Financeiro (fatias 1 a 4), fechada em 04/09/2026.
**Status de todos:** encontrados, verificados no código, **não corrigidos**.

Este documento existe porque a leva de layout encontrou coisas que **não são
layout**. Corrigi-las muda o que o sistema faz — quanto dinheiro sai, qual
número aparece numa decisão, o que fica gravado no banco. Isso não é decisão
de quem está reformando a tela.

Cada achado abaixo traz: **o que acontece**, **o que custa** e **a decisão
que falta**. Nenhum foi tocado. O que a leva fez, quando fez algo, está
marcado como *mitigação* — e mitigação não é conserto.

---

## PARTE 1 — DINHEIRO QUE SAI

### N1. Uma falha de internet muda o caminho de envio de um lote de pagamento, sem avisar

**O que acontece.** Antes de enviar pagamentos, a tela pergunta ao Banco do
Brasil se o serviço está de pé. Se essa pergunta **falha por rede**, o
sistema não avisa: ele assume que o provedor real está desligado. A pastilha
passa a dizer **"MOCK"**, o botão vira "Enviar mock", e o envio vai para
**outro endereço** — o de teste.

**O que custa.** O operador lê "MOCK" e acredita que está testando. Nem ele
nem a trilha de auditoria registram que aquilo foi um erro de rede, não um
estado do sistema. Um lote que ele pensou ter enviado de verdade não foi; ou
um lote de teste que ele pensou ser teste foi para o lugar errado.

**A decisão que falta.** Quando a consulta de saúde falha, o sistema deve:
(a) bloquear o envio até saber; (b) avisar em tela que não conseguiu
verificar e perguntar; ou (c) manter o comportamento atual. Hoje é (c), por
omissão — ninguém escolheu.

> Onde: `frontend/src/pages/FinanceiroPagamentos.jsx`, ~365 e ~393.

### N2. A chave que separa "sai dinheiro de verdade" de "não sai" tem nome invertido

**O que acontece.** A variável chamada `isBbSandbox` — que qualquer leitor
entende como "está em ambiente de teste" — é verdadeira **quando o provedor
REAL está habilitado**. Ela governa o rótulo, o botão de envio e a
habilitação do "Sincronizar BB".

**O que custa.** Nada, enquanto ninguém mexer. Tudo, no dia em que alguém
mexer confiando no nome. É a fronteira entre sair e não sair dinheiro.

**A decisão que falta.** Renomear toca 12 pontos numa tela de dinheiro, e
qualquer erro na troca é caro. É trabalho que precisa ser agendado com teste
dedicado — não emendado numa leva de layout.

### N3. Três ações que movimentam caixa não pedem confirmação sobre o valor

| Ação | O que ela faz | Barreira hoje |
|---|---|---|
| **Enviar ao BB** | o dinheiro sai | só o campo de MFA |
| **Confirmar baixa** | grava movimento financeiro | nenhuma |
| **Gerar boletos em lote** | emite em série | nenhuma |

**O que custa.** O campo de MFA é preenchimento de campo, **não
consentimento sobre um valor**: no momento do clique o operador não vê o
código do lote, nem a quantidade de itens, nem o total. Ele autoriza que é
ele — não autoriza *aquele valor*. "Confirmar baixa" grava num clique e
desfazer exige estorno. "Gerar boletos em lote" não declara que, se for
interrompido no meio, **o que já foi gerado fica gerado**.

**A decisão que falta.** Acrescentar um passo que mostre lote, quantidade e
total antes do envio é decisão de negócio: atrasa o operador em troca de uma
barreira real. É seu chamado, não da reforma.

### N4. Justificativa em confirmação de caixa: obrigatória ou não?

**O que acontece.** Em três das quatro confirmações de caixa, a justificativa
segue **opcional**. A leva manteve assim de propósito: o campo antigo aceitava
vazio e, quando vazio, o sistema gravava um texto padrão. Passar a exigir
mudaria o que chega ao servidor.

**A decisão que falta.** Numa tela que movimenta caixa, a resposta
provavelmente é "sim, obrigatória" — mas essa mudança altera o registro
histórico e precisa da sua palavra.

---

## PARTE 2 — NÚMEROS QUE MENTEM EM TELA DE DECISÃO

Esta é a família mais cara da leva, porque o defeito **não aparece**. O
número está lá, bem formatado, com o rótulo certo. Só está errado.

### N5. Totais que somam só a página, em seis telas

O padrão: a tela pede ao servidor um pedaço da lista (as primeiras 200, as
500 mais antigas), soma **o que veio** e apresenta como **total do recorte**.

| Tela | O que a manchete diz | O que ela na verdade soma |
|---|---|---|
| Resumo de baixas | Valor base, Valor quitação, Estornadas | as primeiras **200** baixas |
| Intercompany | total entre empresas | só a página aberta |
| Endividamento | dívida total | só a página — **subestima** |
| Analítico | total do período | as **500** mais antigas |
| Executivo do Grupo | consolidado do grupo | herda os dois acima |
| *(mais duas fora do serviço de relatórios)* | — | mesmo padrão |

**O que custa.** Um recorte com 260 baixas mostra um "Valor quitação"
silenciosamente **menor que o real**. O CSV exportado carrega o mesmo teto —
ou seja, o número errado sai do sistema e vira anexo de e-mail. No
Endividamento, subestimar a dívida numa tela executiva é o pior sentido
possível do erro.

**O que a leva fez.** Qualificou os rótulos com "do recorte", para que o
número pare de se anunciar como total. **Isso é mitigação, não conserto:**
um número marcado como parcial continua sendo o número que a pessoa vai usar.

**A decisão que falta.** O conserto é paginação no servidor — o total
calculado onde estão todos os dados, não onde está a página. É trabalho de
backend, com custo real, e precisa entrar em algum lugar do plano.

> Onde: `backend/src/services/relatorioFinanceiroService.js` (quatro
> ocorrências independentes) e `FinanceiroBaixas.jsx`.

---

## PARTE 3 — O UPLOAD DE COMPROVANTES INVENTA DADO

Quatro achados no mesmo lugar: `ComprovanteController.uploadMassa`, rota
`POST /comprovantes/upload-massa`. São os mais graves do documento, porque
gravam informação falsa no banco sem ninguém digitar nada.

### N6. O valor do comprovante é inventado a partir do nome do arquivo

O sistema pega **o primeiro número que aparecer no nome do arquivo** e grava
como valor monetário do comprovante.

| Nome do arquivo | **Valor gravado** |
|---|---|
| `SOL-12.pdf` — *o exemplo que a própria tela ensina* | **12** |
| `SOL-000123.pdf` | **000123** |
| `comprovante 1.234,56 SOL-45.pdf` | **1.23** |
| `NF 8899 OBRA-A1.pdf` | **8899** |

Duas coisas ao mesmo tempo:

1. **A convenção que a tela ensina fabrica dinheiro.** Quem seguir a
   instrução `SOL-12.pdf` grava um comprovante de valor 12 que ninguém
   digitou.
2. **Quando o valor está mesmo no nome, ele sai errado.** `1.234,56` vira
   `1.23` — erro de três ordens de grandeza, **para menos**.

Esse campo alimenta a conferência de comprovantes.

**Recomendação.** Não inferir valor de nome de arquivo. **Um valor inventado
é pior que valor ausente: ausente se vê, inventado se confere.**

### N7. "Upload realizado com sucesso" para dois desfechos diferentes

Arquivo com o código da solicitação no nome → fica **vinculado**. Arquivo sem
→ fica **pendente**, esperando alguém vincular à mão. Os dois recebiam a
mesma frase de sucesso.

**Mitigado no front** nesta leva: a tela agora conta antes do envio quantos
arquivos não têm o código, e depois diz quantos ficaram pendentes. Mitigação,
não conserto — quem sabe o desfecho de cada arquivo é o servidor, e a
resposta dele continua não dizendo.

### N8. Falha no meio do lote grava metade e responde erro total

Se o sétimo de dez arquivos falhar, os seis primeiros **já estão gravados** e
a resposta é "erro no upload". A pessoa reenvia os dez — e não há nenhuma
trava contra repetição, então **os seis primeiros duplicam**.

Combinado com N6: cada duplicata carrega o mesmo valor inventado.

### N9. `OBRA-3` no nome do arquivo pode vincular à obra errada

Não achando obra pelo código, o sistema procura pelo **número interno** da
tabela. Um arquivo chamado `OBRA-3 comprovante.pdf`, numa base onde não
exista obra de código "3", é vinculado à obra **cujo registro é o número 3**
— que pode ser qualquer uma.

Convenção de nome de arquivo alcançando a chave primária do banco.

---

## PARTE 4 — REGRA DESENHADA QUE NUNCA ENTROU EM OPERAÇÃO

### N10. "Setores sem alteração de status": existe tela, existe arquivo no servidor, não existe rota

**O que acontece.** Alguém desenhou uma regra: marcar setores que **não
exibem** o botão "Alterar status" no detalhe da solicitação. A tela foi
escrita (`SetoresSemAlteracaoStatus.jsx`) e o arquivo de serviço existe no
backend (`services/solicitacao/setoresSemAlteracaoStatus.js`).

**O que falta.** Não há rota no servidor, não há chamada no front, e nenhum
dos dois arquivos tem consumidor. **A regra nunca funcionou.** A tela foi
removida na limpeza de 04/09 porque não funcionaria se alguém chegasse nela;
o arquivo do servidor continua lá, sem uso.

**A decisão que falta.** Ou a regra é necessária — e aí falta terminar o
trabalho (rota, chamada, tela) — ou não é, e o arquivo do servidor sai. Hoje
ela ocupa espaço fingindo existir.

---

## RESUMO PARA DECIDIR

| # | Achado | Classe | Urgência |
|---|---|---|---|
| N6 | Valor de comprovante inventado do nome do arquivo | dado falso gravado | **alta** |
| N9 | `OBRA-n` vincula pelo número interno | dado falso gravado | **alta** |
| N8 | Lote parcial + reenvio duplica registros | dado duplicado | **alta** |
| N1 | Falha de rede rebaixa envio para MOCK em silêncio | dinheiro | **alta** |
| N5 | Totais que somam só a página em 6 telas | decisão sobre número errado | **alta** |
| N3 | Ações de caixa sem confirmação de valor | consentimento | média |
| N2 | `isBbSandbox` com nome invertido | risco futuro | média |
| N7 | Mesma mensagem para vinculado e pendente | informação | média |
| N4 | Justificativa opcional em confirmação de caixa | registro histórico | baixa |
| N10 | Regra de setor sem rota, sem consumidor | trabalho pela metade | baixa |

**As três primeiras têm a mesma natureza e por isso vêm juntas no topo:** o
sistema grava no banco algo que ninguém digitou. Erro de tela a pessoa vê;
dado inventado ela confere, acredita e usa.
