import { API_URL, authHeaders, fileUrl } from './api';

function handleJsonResponse(response, fallbackMessage) {
  return response.text().then((text) => {
    if (!response.ok) {
      throw new Error(text || fallbackMessage);
    }

    return text ? JSON.parse(text) : null;
  });
}

export async function listarUnidades() {
  const response = await fetch(`${API_URL}/compras/unidades`, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar unidades');
}

export async function criarUnidade(data) {
  const response = await fetch(`${API_URL}/compras/unidades`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar unidade');
}

export async function atualizarUnidade(id, data) {
  const response = await fetch(`${API_URL}/compras/unidades/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao atualizar unidade');
}

export async function deletarUnidade(id) {
  const response = await fetch(`${API_URL}/compras/unidades/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao deletar unidade');
}

export async function listarCategorias() {
  const response = await fetch(`${API_URL}/compras/categorias`, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar categorias');
}

export async function criarCategoria(data) {
  const response = await fetch(`${API_URL}/compras/categorias`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar categoria');
}

export async function atualizarCategoria(id, data) {
  const response = await fetch(`${API_URL}/compras/categorias/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao atualizar categoria');
}

export async function deletarCategoria(id) {
  const response = await fetch(`${API_URL}/compras/categorias/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao deletar categoria');
}

export async function listarInsumos(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/compras/insumos?${query}`
    : `${API_URL}/compras/insumos`;

  const response = await fetch(url, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar insumos');
}

export async function criarInsumo(data) {
  const response = await fetch(`${API_URL}/compras/insumos`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar insumo');
}

export async function atualizarInsumo(id, data) {
  const response = await fetch(`${API_URL}/compras/insumos/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao atualizar insumo');
}

export async function deletarInsumo(id) {
  const response = await fetch(`${API_URL}/compras/insumos/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao deletar insumo');
}

export async function importarInsumosEmMassa(data) {
  const response = await fetch(`${API_URL}/compras/insumos/importar-massa`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao importar insumos em massa');
}

export async function listarApropriacoes(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/compras/apropriacoes?${query}`
    : `${API_URL}/compras/apropriacoes`;

  const response = await fetch(url, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar apropriacoes');
}

export async function criarApropriacao(data) {
  const response = await fetch(`${API_URL}/compras/apropriacoes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar apropriacao');
}

export async function atualizarApropriacao(id, data) {
  const response = await fetch(`${API_URL}/compras/apropriacoes/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao atualizar apropriacao');
}

export async function deletarApropriacao(id) {
  const response = await fetch(`${API_URL}/compras/apropriacoes/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao deletar apropriacao');
}

export async function listarFornecedoresCompra(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/compras/fornecedores?${query}`
    : `${API_URL}/compras/fornecedores`;

  const response = await fetch(url, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar fornecedores');
}

export async function criarFornecedorCompra(data) {
  const response = await fetch(`${API_URL}/compras/fornecedores`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar fornecedor');
}

export async function listarSolicitacoesCompra(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query
    ? `${API_URL}/compras/solicitacoes?${query}`
    : `${API_URL}/compras/solicitacoes`;

  const response = await fetch(url, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar solicitacoes de compra');
}

export async function obterSolicitacaoCompra(id) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}`, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar solicitacao de compra');
}

export async function criarSolicitacaoCompra(data) {
  const response = await fetch(`${API_URL}/compras/solicitacoes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao criar solicitacao de compra');
}

export async function integrarSolicitacaoCompra(id, data) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}/integrar`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao integrar solicitacao');
}

export async function liberarSolicitacaoCompra(id) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}/liberar`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({})
  });
  return handleJsonResponse(response, 'Erro ao liberar solicitacao para compra');
}

export async function enviarSolicitacaoCompraParaFornecedores(id, data) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}/enviar`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao enviar cotacao para fornecedores');
}

export async function obterComparativoSolicitacaoCompra(id) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}/comparativo`, {
    headers: authHeaders()
  });
  return handleJsonResponse(response, 'Erro ao buscar comparativo da solicitacao');
}

export async function encerrarSolicitacaoCompra(id, data) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}/encerrar`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao encerrar solicitacao de compra');
}

export async function uploadAnexoTemporarioCompra(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/compras/anexos-temporarios`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  return handleJsonResponse(response, 'Erro ao enviar arquivo do item');
}

export async function obterUrlAssinadaCompra(caminhoArquivo) {
  if (!caminhoArquivo) {
    return null;
  }

  if (!String(caminhoArquivo).startsWith('http')) {
    return fileUrl(caminhoArquivo);
  }

  const response = await fetch(
    `${API_URL}/anexos/presign?url=${encodeURIComponent(caminhoArquivo)}`,
    { headers: authHeaders() }
  );

  return handleJsonResponse(response, 'Erro ao obter link do arquivo').then((data) => data?.url || caminhoArquivo);
}

export async function baixarPdfSolicitacaoCompra(id) {
  const response = await fetch(`${API_URL}/compras/solicitacoes/${id}/pdf`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error('Erro ao gerar PDF');
  }

  return response.blob();
}

export async function obterCotacaoPublica(token) {
  const response = await fetch(`${API_URL}/cotacoes/${token}`);
  return handleJsonResponse(response, 'Erro ao buscar cotacao');
}

export async function responderCotacaoPublica(token, data) {
  const response = await fetch(`${API_URL}/cotacoes/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleJsonResponse(response, 'Erro ao enviar resposta da cotacao');
}

export async function uploadPlanilhaCotacaoPublica(token, file) {
  const formData = new FormData();
  formData.append('token', token);
  formData.append('file', file);

  const response = await fetch(`${API_URL}/cotacoes/upload`, {
    method: 'POST',
    body: formData
  });
  return handleJsonResponse(response, 'Erro ao enviar planilha da cotacao');
}

export async function baixarModeloCotacaoPublica(token) {
  const response = await fetch(`${API_URL}/cotacoes/${token}/modelo`);
  if (!response.ok) {
    throw new Error('Erro ao baixar modelo da cotacao');
  }
  return response.blob();
}
