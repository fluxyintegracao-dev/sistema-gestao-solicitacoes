import { API_URL, authHeaders } from '../../../services/api';

async function parseResponse(response, fallbackMessage) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.error || fallbackMessage);
    error.status = response.status;
    error.code = payload?.code || null;
    error.details = payload?.details || null;
    throw error;
  }
  return payload;
}

export async function listarCustosRecebiveisObras(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      query.set(key, value);
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${API_URL}/custos-recebiveis/obras${suffix}`, {
    headers: authHeaders()
  });
  return parseResponse(response, 'Erro ao listar obras de Custos e Recebíveis');
}

export async function obterPlanoMicroObra(obraId, planoId = null) {
  const query = new URLSearchParams();
  if (planoId) query.set('plano_id', planoId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(
    `${API_URL}/custos-recebiveis/obras/${obraId}/plano${suffix}`,
    { headers: authHeaders() }
  );
  return parseResponse(response, 'Erro ao consultar estrutura micro');
}

function buildImportForm(file, motivoVersao = '') {
  const form = new FormData();
  form.append('file', file);
  if (String(motivoVersao || '').trim()) {
    form.append('motivo_versao', String(motivoVersao).trim());
  }
  return form;
}

export async function validarPlanoMicro(obraId, file) {
  const response = await fetch(
    `${API_URL}/custos-recebiveis/obras/${obraId}/plano/importar/validar`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: buildImportForm(file)
    }
  );
  return parseResponse(response, 'Erro ao validar planilha micro');
}

export async function importarPlanoMicro(obraId, file, motivoVersao = '') {
  const response = await fetch(
    `${API_URL}/custos-recebiveis/obras/${obraId}/plano/importar`,
    {
      method: 'POST',
      headers: authHeaders({
        'Idempotency-Key': globalThis.crypto?.randomUUID?.()
          || `cr-${Date.now()}-${Math.random().toString(16).slice(2)}`
      }),
      body: buildImportForm(file, motivoVersao)
    }
  );
  return parseResponse(response, 'Erro ao importar planilha micro');
}

export async function publicarPlanoMicro(planoId, justificativa = '') {
  const response = await fetch(
    `${API_URL}/custos-recebiveis/planos/${planoId}/publicar`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        justificativa_divergencia: String(justificativa || '').trim() || null
      })
    }
  );
  return parseResponse(response, 'Erro ao publicar versão da estrutura micro');
}

export async function baixarModeloPlanoMicro(obraId, obraCodigo = '') {
  const response = await fetch(
    `${API_URL}/custos-recebiveis/obras/${obraId}/plano/modelo`,
    { headers: authHeaders() }
  );
  if (!response.ok) {
    await parseResponse(response, 'Erro ao baixar modelo da estrutura micro');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeCode = String(obraCodigo || obraId).replace(/[^a-zA-Z0-9_-]+/g, '-');
  anchor.href = url;
  anchor.download = `modelo-plano-micro-${safeCode}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
