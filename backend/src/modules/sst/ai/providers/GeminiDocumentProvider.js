'use strict';

const {
  blockedCredential,
  blockedMissingText,
  buildDocumentPrompt,
  normalizeProviderJsonResult
} = require('./providerUtils');

const DEFAULT_MODEL = process.env.GOOGLE_AI_MODEL || process.env.SST_IA_DOCUMENTAL_MODEL || 'gemini-1.5-flash';

function getResponseText(payload) {
  return (payload?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

class GeminiDocumentProvider {
  constructor({ apiKey = process.env.GOOGLE_AI_API_KEY, model = DEFAULT_MODEL } = {}) {
    this.name = 'gemini';
    this.apiKey = apiKey;
    this.model = model;
  }

  isReady() {
    return Boolean(this.apiKey);
  }

  async analyzeDocument({ documentType, text, metadata = {}, schema = [] } = {}) {
    if (!this.isReady()) return blockedCredential(this.name, 'GOOGLE_AI_API_KEY');
    if (!String(text || '').trim()) return blockedMissingText(this.name);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildDocumentPrompt({ documentType, text, metadata, schema }) }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        executed: true,
        provider: this.name,
        status: 'ERRO_PROVIDER',
        confidence: null,
        extracted: {},
        raw: null,
        errors: [payload?.error?.message || `Erro Gemini HTTP ${response.status}`]
      };
    }

    return normalizeProviderJsonResult(this.name, getResponseText(payload) || payload);
  }
}

module.exports = GeminiDocumentProvider;
