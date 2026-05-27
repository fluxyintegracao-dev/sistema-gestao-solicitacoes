'use strict';

class MockDisabledProvider {
  constructor(reason = 'IA documental desabilitada por configuracao.') {
    this.name = 'disabled';
    this.reason = reason;
  }

  async analyzeDocument() {
    return {
      executed: false,
      provider: this.name,
      status: 'BLOQUEADO_CONFIGURACAO',
      confidence: null,
      extracted: {},
      raw: null,
      errors: [this.reason]
    };
  }
}

module.exports = MockDisabledProvider;
