# Visao Geral

## O que e o sistema
Sistema corporativo para gestao de solicitacoes entre obras e setores administrativos, com trilha auditavel, controle por perfil/setor e modulo integrado de solicitacoes de compras.

## Uso atual
- Projeto em producao e em uso por empresa real.
- Backend: EC2 + PM2 + Nginx.
- Frontend: Vercel.
- Banco: MySQL em RDS.
- Arquivos: S3 com URLs assinadas.

## Objetivos centrais
- centralizar abertura e tratamento de solicitacoes
- registrar historico completo de mudancas
- controlar visibilidade por perfil, setor, obra e historico
- reduzir retrabalho e perda de contexto
- suportar o modulo de compras sem quebrar o fluxo principal

## Fluxos principais em operacao
- login e sessao
- dashboard
- solicitacoes do fluxo principal
- contratos
- usuarios
- comprovantes
- comunicacao interna
- arquivos modelos
- solicitacoes de compra

## Premissas de manutencao
- o sistema esta em uso real; toda mudanca precisa priorizar estabilidade
- o fluxo principal e o modulo compras compartilham partes estruturais
- comunicacao interna e um modulo com historico de pressao no banco e precisa de cuidado extra
