'use strict';

const {
  blockedCredential,
  blockedMissingText,
  buildDocumentPrompt,
  normalizeProviderJsonResult
} = require('./providerUtils');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || process.env.SST_IA_DOCUMENTAL_MODEL || 'claude-3-5-haiku-latest';

function getResponseText(payload) {
  return (payload?.content || [])
    .map((item) => item?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

class AnthropicDocumentProvider {
  constructor({ apiKey = process.env.ANTHROPIC_API_KEY, model = DEFAULT_MODEL } = {}) {
    this.name = 'anthropic';
    this.apiKey = apiKey;
    this.model = model;
  }

  isReady() {
    return Boolean(this.apiKey);
  }

  async analyzeDocument({ documentType, text, metadata = {}, schema = [] } = {}) {
    if (!this.isReady()) return blockedCredential(this.name, 'ANTHROPIC_API_KEY');
    if (!String(text || '').trim()) return blockedMissingText(this.name);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildDocumentPrompt({ documentType, text, metadata, schema }) }]
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
        errors: [payload?.error?.message || `Erro Anthropic HTTP ${response.status}`]
      };
    }

    return normalizeProviderJsonResult(this.name, getResponseText(payload) || payload);
  }
}

module.exports = AnthropicDocumentProvider;
