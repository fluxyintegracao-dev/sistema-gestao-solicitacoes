'use strict';

const {
  blockedCredential,
  blockedMissingText,
  buildDocumentPrompt,
  normalizeProviderJsonResult
} = require('./providerUtils');

const DEFAULT_MODEL = process.env.SST_IA_DOCUMENTAL_MODEL || 'gpt-4.1-mini';

function getResponseText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const parts = [];
  (payload?.output || []).forEach((item) => {
    (item?.content || []).forEach((content) => {
      if (content?.text) parts.push(content.text);
      if (content?.type === 'output_text' && content?.text) parts.push(content.text);
    });
  });
  return parts.join('\n').trim();
}

class OpenAiDocumentProvider {
  constructor({ apiKey = process.env.OPENAI_API_KEY, model = DEFAULT_MODEL } = {}) {
    this.name = 'openai';
    this.apiKey = apiKey;
    this.model = model;
  }

  isReady() {
    return Boolean(this.apiKey);
  }

  async analyzeDocument({ documentType, text, metadata = {}, schema = [] } = {}) {
    if (!this.isReady()) {
      return blockedCredential(this.name, 'OPENAI_API_KEY');
    }

    if (!String(text || '').trim()) {
      return blockedMissingText(this.name);
    }

    const prompt = buildDocumentPrompt({ documentType, text, metadata, schema });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: prompt,
        text: { format: { type: 'json_object' } }
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
        errors: [payload?.error?.message || `Erro OpenAI HTTP ${response.status}`]
      };
    }

    return normalizeProviderJsonResult(this.name, getResponseText(payload) || payload);
  }
}

module.exports = OpenAiDocumentProvider;
