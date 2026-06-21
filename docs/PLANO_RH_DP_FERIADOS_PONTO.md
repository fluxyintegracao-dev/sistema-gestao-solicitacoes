# Plano RH/DP - Feriados, adicionais e ponto

## Objetivo

Estruturar a apuracao do RH/DP para calcular adicionais de jornada com base em sabados, domingos e feriados por cidade, preparando a integracao futura com folha de ponto em Excel ou PDF.

## Regras alvo

- Sabado: adicional de 75%.
- Domingo: adicional de 100%.
- Feriado: adicional de 100%.
- Feriado deve considerar a cidade vinculada a obra onde o colaborador prestou servico.
- A importacao de jornada deve continuar auditavel, indicando linha, colaborador, obra/apuracao e regra aplicada.

## Fase 1 - Cadastro de calendario

- Criar cadastro de feriados por cidade/UF.
- Campos minimos: cidade, UF, data, nome do feriado, tipo do feriado e status ativo/inativo.
- Permitir importacao em massa de feriados.
- Vincular obra/centro de custo a cidade/UF usada no calendario.

## Fase 2 - Motor de calculo

- Criar servico central para classificar cada dia trabalhado como dia util, sabado, domingo ou feriado.
- Calcular adicional conforme a classificacao do dia.
- Registrar memoria de calculo por colaborador e competencia.
- Bloquear fechamento quando houver obra sem cidade configurada em jornadas que dependam de feriado municipal.

## Fase 3 - Importacao de ponto

- Criar modelo de importacao de ponto em Excel com colaborador, matricula/CPF, data, horas, faltas, adicionais e observacoes.
- Avaliar leitura de PDF apenas como apoio operacional, mantendo Excel como fonte estruturada oficial.
- Mostrar preview em tabela, com erro por linha e campos interpretados.

## Fase 4 - Apuracao e auditoria

- Aplicar os adicionais no fechamento antes da geracao dos titulos.
- Registrar log de regra aplicada por dia e por colaborador.
- Exibir divergencias e permitir revisao antes do envio ao financeiro.
- Incluir filtros e relatorios para adicionais por obra, colaborador e competencia.

## Fora do escopo deste ajuste

- Nao alterar agora a formula financeira da apuracao atual.
- Nao hardcodar feriados nacionais, estaduais ou municipais no codigo.
- Nao interpretar PDF como fonte definitiva sem validacao humana.
