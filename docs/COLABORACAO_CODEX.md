# Colaboracao entre Codex

## Objetivo
Padronizar trabalho colaborativo entre agentes e preservar a integridade do sistema em producao.

## 1. Principios obrigatorios
- nenhum agente deve assumir que um arquivo livre pode ser alterado sem registrar ownership
- alteracoes em arquivos centrais exigem mais rigor e validacao
- documentacao e `AGENTS.md` fazem parte do contexto vivo do sistema e devem ser atualizados quando o comportamento real mudar
- nenhum agente deve reverter trabalho de outro agente sem alinhamento explicito

## 2. Estrutura minima de colaboracao
Abrir a tarefa com:
- objetivo
- escopo
- arquivos previstos
- risco
- criterio de validacao

## 3. Regra de ownership de arquivos
Sempre registrar ownership temporario antes de editar.

Formato sugerido:
- agente
- objetivo
- arquivos reservados
- inicio
- status

## 4. Ownership ativo
No momento, nenhum ownership persistente e mantido neste documento. Registrar apenas durante tarefas colaborativas ativas.

## 5. Arquivos de alto risco
Arquivos que exigem coordenacao reforcada:
- `backend/server.js`
- `backend/src/app.js`
- `backend/src/routes.js`
- `backend/src/models/index.js`
- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/controllers/UsuarioController.js`
- `backend/src/controllers/AuthController.js`
- `backend/src/models/User.js`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/services/compras.js`
- `docs/RELATORIO_FUNCIONALIDADES_REGRAS_E_VALOR.md`
- `AGENTS.md`

## 6. Fluxo operacional padrao
1. abrir a tarefa
2. reservar arquivos
3. implementar sem editar arquivos de ownership alheio
4. validar localmente o que mudou
5. atualizar documentacao se a regra ou o fluxo mudar
6. encerrar ownership

## 7. Regra para evitar conflito no mesmo arquivo
Se dois agentes precisarem do mesmo arquivo:
- dividir por tempo, nao por tentativa simultanea
- fazer handoff explicito
- registrar o ponto exato da transferencia

## 8. Handoff minimo
Informar sempre:
- o que foi alterado
- o que nao foi alterado
- o que foi validado
- riscos restantes
- proximos arquivos permitidos para edicao

## 9. Regra de documentacao
Atualizar `docs/` e `AGENTS.md` quando houver:
- nova regra de permissao
- nova tela ou rota
- mudanca relevante de UX
- mudanca de deploy
- alteracao estrutural em compras, comunicacao, contratos, uploads ou filtros

## 10. Regra final
Se houver duvida entre velocidade e seguranca, priorizar seguranca. O sistema esta em producao.
