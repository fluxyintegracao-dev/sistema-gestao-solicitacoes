# FLUXY

Sistema operacional institucional para centralizar solicitacoes, obras, contratos, compras, financeiro, documentos, pessoas, seguranca do trabalho e governanca.

O FLUXY nasceu dentro de uma operacao real de construcao civil. A solicitacao e o principal hub do sistema e conecta os setores da empresa aos demais dominios, mantendo historico, anexos, permissoes e rastreabilidade.

## Estado do produto

- sistema interno em producao;
- uma instalacao institucional com suporte a multiempresa;
- backend como autoridade para regras, permissoes e valores criticos;
- modulos habilitaveis por configuracao;
- foco em estabilidade, governanca, testes, documentacao e continuidade operacional.

## Stack

- backend: Node.js, Express, Sequelize e MySQL;
- frontend: React, Vite, React Router e Tailwind CSS;
- arquivos: Amazon S3 com URLs assinadas;
- producao: EC2, PM2, Nginx e Vercel;
- mobile: Expo/React Native;
- testes de interface: Playwright.

## Execucao local

```bash
cd backend
npm install
npm run migrate
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Use `backend/.env.example` como referencia para o ambiente. O backend executa migrations pendentes na inicializacao e nao depende de `sync({ alter: true })`.

## Documentacao

A entrada oficial e [docs/README.md](docs/README.md). Antes de alterar um fluxo, leia tambem:

1. `docs/arquitetura/MAPA_MODULOS.md`;
2. `docs/arquitetura/PROPRIEDADE_DADOS.md`;
3. `docs/arquitetura/FLUXOS_ENTRE_MODULOS.md`;
4. o `README.md` canonico do modulo afetado;
5. `AGENTS.md`.

## Regras estruturais

- o frontend orienta a experiencia; o backend decide autorizacao e consistencia;
- exclusoes sensiveis devem ser logicas e auditaveis;
- criacoes, aprovacoes, baixas, envios, compras e integracoes devem ser protegidas contra duplicidade;
- mudancas em entidades compartilhadas exigem validacao dos modulos consumidores;
- documentos de plano, fase, sprint e relatorio historico nao substituem a documentacao canonica atual.
