# Modulo de Compras

## Frontend
- `frontend/src/modules/solicitacao-compra/pages/`
- `frontend/src/modules/solicitacao-compra/components/CompraPreviewModal.jsx`
- `frontend/src/modules/solicitacao-compra/utils/preview.js`

## Backend
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/controllers/UnidadeController.js`
- `backend/src/controllers/CategoriaController.js`
- `backend/src/controllers/InsumoController.js`
- `backend/src/controllers/ApropriacaoController.js`
- `backend/src/controllers/FornecedorCompraController.js`
- `backend/src/controllers/CotacaoFornecedorController.js`

## Fluxo resumido
- abrir nova solicitacao de compra
- revisar itens
- finalizar
- gerar PDF
- acompanhar detalhe
- gerir cadastros auxiliares

## Observacao
Preview de imagem e PDF no modulo compras foi padronizado em modal interno, sem abrir nova pagina.
