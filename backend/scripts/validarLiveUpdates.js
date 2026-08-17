const assert = require('assert');
const { EventEmitter } = require('events');
const liveUpdatesBroker = require('../src/services/liveUpdatesBroker');

class FakeRequest extends EventEmitter {
  constructor(userId) {
    super();
    this.user = { id: userId };
    this.socket = {
      setKeepAlive() {},
      setTimeout() {}
    };
  }
}

class FakeResponse extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.writableEnded = false;
    this.chunks = [];
    this.flushes = 0;
  }

  write(chunk) {
    this.chunks.push(String(chunk));
    return true;
  }

  flush() {
    this.flushes += 1;
  }
}

function run() {
  const userId = 987654;
  const req = new FakeRequest(userId);
  const res = new FakeResponse();
  const cleanup = liveUpdatesBroker.connect({
    req,
    res,
    topics: 'solicitacoes,compras'
  });

  try {
    assert(res.chunks.some((chunk) => chunk.includes('event: connected')));

    req.emit('end');
    assert.strictEqual(
      liveUpdatesBroker.publishToUsers(
        [userId],
        { id: 1 },
        { topics: ['solicitacoes'], eventName: 'solicitacao.updated' }
      ),
      1,
      'O fim do corpo do GET nao pode encerrar o stream SSE.'
    );
    assert(res.chunks.some((chunk) => chunk.includes('event: solicitacao.updated')));
    assert(res.flushes > 0, 'O stream deve descarregar os eventos sem buffering local.');

    res.emit('close');
    assert.strictEqual(
      liveUpdatesBroker.publishToUsers(
        [userId],
        { id: 2 },
        { topics: ['solicitacoes'] }
      ),
      0,
      'A conexao deve ser removida quando o response for fechado.'
    );

    console.log('Validacao do canal de atualizacoes em tempo real concluida com sucesso.');
  } finally {
    cleanup();
  }
}

run();
