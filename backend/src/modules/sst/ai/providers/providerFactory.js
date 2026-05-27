'use strict';

const MockDisabledProvider = require('./MockDisabledProvider');
const OpenAiDocumentProvider = require('./OpenAiDocumentProvider');
const AnthropicDocumentProvider = require('./AnthropicDocumentProvider');
const GeminiDocumentProvider = require('./GeminiDocumentProvider');
const HttpDocumentProvider = require('./HttpDocumentProvider');

function envEnabled(value) {
  return ['true', '1', 'sim', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function getConfiguredProvider(providerName = process.env.SST_IA_DOCUMENTAL_PROVIDER || 'openai') {
  if (!envEnabled(process.env.SST_IA_DOCUMENTAL_ENABLED)) {
    return new MockDisabledProvider('SST_IA_DOCUMENTAL_ENABLED=false.');
  }

  const normalized = String(providerName || '').trim().toLowerCase();
  if (['openai', 'open_ai'].includes(normalized)) {
    return new OpenAiDocumentProvider();
  }
  if (['anthropic', 'claude'].includes(normalized)) {
    return new AnthropicDocumentProvider();
  }
  if (['gemini', 'google', 'google_ai'].includes(normalized)) {
    return new GeminiDocumentProvider();
  }
  if (['http', 'generic', 'webhook'].includes(normalized)) {
    return new HttpDocumentProvider();
  }

  return new MockDisabledProvider(`Provider IA documental nao suportado nesta instalacao: ${providerName}.`);
}

module.exports = {
  getConfiguredProvider
};
