'use strict';

const {
  blockedCredential,
  blockedMissingText,
  buildDocumentPrompt,
  normalizeProviderJsonResult
} = require('./providerUtils');

class HttpDocumentProvider {
  constructor({
    endpoint = process.env.SST_IA_DOCUMENTAL_HTTP_ENDPOINT,
    apiKey = process.env.SST_IA_DOCUMENTAL_HTTP_API_KEY,
    authHeader = process.env.SST_IA_DOCUMENTAL_HTTP_AUTH_HEADER || 'Authorization'
  } = {}) {
    this.name = 'http';
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.authHeader = authHeader;
  }

  isReady() {
    return Boolean(this.endpoint);
  }

  async analyzeDocument({ documentType, text, metadata = {}, schema = [] } = {}) {
    if (!this.isReady()) return blockedCredential(this.name, 'SST_IA_DOCUMENTAL_HTTP_ENDPOINT');
    if (!String(text || '').trim()) return blockedMissingText(this.name);

    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers[this.authHeader] = this.authHeader.toLowerCase() === 'authorization' ? `Bearer ${this.apiKey}` : this.apiKey;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentType,
        text,
        metadata,
        schema,
        prompt: buildDocumentPrompt({ documentType, text, metadata, schema })
      })
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
    if (!response.ok) {
      return {
        executed: true,
        provider: this.name,
        status: 'ERRO_PROVIDER',
        confidence: null,
        extracted: {},
        raw: null,
        errors: [`Erro HTTP provider ${response.status}`]
      };
    }

    return normalizeProviderJsonResult(this.name, payload);
  }
}

module.exports = HttpDocumentProvider;
