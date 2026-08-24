# Handoff Global

## Handoff

- data: 2026-08-24
  sessao: root-2026-08-24-correcao-importacao-orcamento
  status: finalizado
  escopo concluido:
    - Importacao de apropriacoes passa a preservar o numero real de celulas XLSX, sem depender da formatacao visual de milhar/decimal.
    - Parser textual cobre formatos brasileiros, formatos com ponto decimal e valores sem centavos exibidos com separador de milhar.
    - Rotina transacional e idempotente preparada para corrigir 14 valores auditados da obra 4.
  arquivos alterados:
    - backend/src/controllers/ApropriacaoController.js
    - backend/src/utils/excelWorkbook.js
    - backend/src/utils/valorMonetario.js
    - backend/scripts/corrigirOrcamentoApropriacoesObra4.js
    - backend/scripts/validarImportacaoApropriacoes.js
    - backend/package.json
  validacao executada:
    - node --check nos arquivos backend alterados
    - npm run test:importacao-apropriacoes
    - git diff --check
  pendencias:
    - Fazer deploy do backend e executar primeiro a simulacao, depois `--apply`, no ambiente que contem a obra 4.
  riscos conhecidos:
    - A rotina aborta sem alterar nada se algum dos 14 registros ja tiver sido modificado depois da auditoria.
  ownership liberado:
    - backend/src/controllers/ApropriacaoController.js
    - backend/scripts/corrigirOrcamentoApropriacoesObra4.js
    - backend/scripts/validarImportacaoApropriacoes.js

## Handoff

- data: 2026-08-24
  sessao: root-2026-08-24-ajuste-auditoria-e-conversao-apropriacoes
  status: finalizado
  escopo concluido:
    - Confronto da planilha XLSX original da obra 4 identificou dois valores transcritos incorretamente na primeira rotina: `00.008 = 297534.83` e `00.021 = 142112.31`.
    - A rotina de correcao agora aceita tanto o estado anterior como o estado aplicado inicialmente, corrige somente registros ainda divergentes e continua idempotente.
    - As 22 planilhas originais foram convertidas para o layout de importacao de apropriacoes, selecionando somente linhas com codigo, descricao e valor informado.
  arquivos alterados:
    - backend/scripts/corrigirOrcamentoApropriacoesObra4.js
  validacao executada:
    - node --check backend/scripts/corrigirOrcamentoApropriacoesObra4.js
    - npm run test:importacao-apropriacoes
    - Leitura do XLSX convertido pelo mesmo helper ExcelJS utilizado no backend (1750 linhas de dados).
  pendencias:
    - Publicar este ajuste e executar a rotina complementar na producao para corrigir os R$ 8,80 restantes da obra 4.
    - Importar cada obra separadamente, apos revisao, para evitar atualizacao massiva nao intencional.
  riscos conhecidos:
    - O arquivo consolidado de conversao e um artefato de conferencia; o importador atual aplica todas as linhas enviadas e nao possui pre-visualizacao de diferencas.
    - O arquivo `32-Aprop_Ed Pedra Menina.xlsx` declara internamente o codigo de obra `33`; esse foi o codigo mantido na conversao.
  ownership liberado:
    - backend/scripts/corrigirOrcamentoApropriacoesObra4.js

## Handoff

- data: 2026-08-24
  sessao: root-2026-08-24-gestao-obras-rateio-apropriacoes
  status: finalizado_com_auditoria_pendente
  escopo concluido:
    - Gestao de obras passa a distribuir valores pagos, saldos em aberto e pedidos por uma unica fonte de apropriacao.
    - Prioridade definida: rateio do titulo, rateio da solicitacao, apropriacao simples do titulo, apropriacao simples da solicitacao e sem apropriacao.
    - O mesmo titulo nunca soma simultaneamente o vinculo do titulo e o vinculo da solicitacao.
    - Rateios por valor, percentual ou quantidade sao convertidos em centavos com fechamento exato; o residuo de arredondamento e distribuido deterministicamente.
    - Resposta da gestao identifica a fonte e detalha as apropriacoes usadas para cada custo/pedido.
  arquivos alterados:
    - backend/src/services/obraGestaoService.js
    - backend/src/services/obraGestaoApropriacaoService.js
    - backend/scripts/validarObraGestaoApropriacoes.js
    - backend/package.json
  validacao executada:
    - node --check nos tres arquivos JavaScript alterados/criados
    - npm run test:obra-gestao-apropriacoes
    - npm run test:importacao-apropriacoes
    - git diff --check
  pendencias:
    - Extrair os dados atuais do banco na EC2 para gerar o comparativo Excel pre-importacao; a copia local nao possui credenciais de banco.
  riscos conhecidos:
    - Titulos com rateio entre obras continuam limitados pela selecao principal `titulos_financeiros.obra_id` da tela; este ajuste trata multiplas apropriacoes dentro da obra carregada.
    - Custos historicos legados continuam sem apropriacao por nao possuirem esse vinculo na tabela de origem.
  ownership liberado:
    - backend/src/services/obraGestaoService.js
    - backend/src/services/obraGestaoApropriacaoService.js
    - backend/scripts/validarObraGestaoApropriacoes.js
    - backend/package.json

## Handoff

- data: 2026-08-24
  sessao: root-2026-08-24-exportacao-auditoria-apropriacoes
  status: finalizado
  escopo concluido:
    - Criado extrator somente leitura para gerar a base agregada do comparativo entre banco e planilhas de apropriacao.
    - Exportacao contem obra, codigo, descricao, valor orcado, hierarquia, atividade, valor pago apropriado e contagens de vinculos.
    - Nao exporta credores, documentos, contas bancarias, solicitacoes individuais ou titulos individuais.
    - Codigos padrao correspondem as 22 planilhas convertidas; podem ser sobrescritos por argumento CLI.
  arquivos alterados:
    - backend/scripts/exportarAuditoriaApropriacoes.js
    - backend/package.json
  validacao executada:
    - node --check backend/scripts/exportarAuditoriaApropriacoes.js
    - npm run test:obra-gestao-apropriacoes
    - git diff --check
  pendencias:
    - Executar na EC2 principal e trazer o JSON para a estacao local, onde sera cruzado com o XLSX e convertido no relatorio final.
  riscos conhecidos:
    - O extrator considera titulos associados pela obra principal; rateios de um mesmo titulo entre obras permanecem fora do escopo desta entrega.
  ownership liberado:
    - backend/scripts/exportarAuditoriaApropriacoes.js
    - backend/package.json
