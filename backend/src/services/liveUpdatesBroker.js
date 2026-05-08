const KEEP_ALIVE_INTERVAL_MS = 25 * 1000;
const DEFAULT_RETRY_MS = 5 * 1000;

let connectionSequence = 0;

function normalizeTopics(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',');

  return Array.from(
    new Set(
      items
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

class LiveUpdatesBroker {
  constructor() {
    this.connections = new Map();
    this.keepAliveTimer = null;
  }

  ensureKeepAliveTimer() {
    if (this.keepAliveTimer) return;

    this.keepAliveTimer = setInterval(() => {
      const ping = `: keep-alive ${Date.now()}\n\n`;

      for (const connection of this.connections.values()) {
        this.writeRaw(connection, ping);
      }

      if (this.connections.size === 0) {
        this.stopKeepAliveTimer();
      }
    }, KEEP_ALIVE_INTERVAL_MS);

    if (typeof this.keepAliveTimer.unref === 'function') {
      this.keepAliveTimer.unref();
    }
  }

  stopKeepAliveTimer() {
    if (!this.keepAliveTimer) return;
    clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = null;
  }

  createConnectionId() {
    connectionSequence += 1;
    return `live-${Date.now()}-${connectionSequence}`;
  }

  connect({ req, res, topics } = {}) {
    const connection = {
      id: this.createConnectionId(),
      userId: Number(req?.user?.id || 0) || null,
      res,
      topics: new Set(normalizeTopics(topics)),
      closed: false
    };

    this.connections.set(connection.id, connection);
    this.ensureKeepAliveTimer();

    if (req?.socket) {
      req.socket.setKeepAlive(true);
      req.socket.setTimeout(0);
    }

    this.writeRaw(connection, `retry: ${DEFAULT_RETRY_MS}\n\n`);
    this.sendEvent(connection, 'connected', {
      ok: true,
      connected_at: new Date().toISOString()
    });

    const cleanup = () => {
      if (connection.closed) return;
      connection.closed = true;
      this.connections.delete(connection.id);
      if (this.connections.size === 0) {
        this.stopKeepAliveTimer();
      }
    };

    req?.on?.('close', cleanup);
    req?.on?.('end', cleanup);
    req?.on?.('error', cleanup);
    res?.on?.('close', cleanup);
    res?.on?.('error', cleanup);

    return cleanup;
  }

  writeRaw(connection, chunk) {
    if (!connection || connection.closed) return false;

    try {
      connection.res.write(chunk);
      return true;
    } catch {
      connection.closed = true;
      this.connections.delete(connection.id);
      return false;
    }
  }

  sendEvent(connection, eventName, payload) {
    if (!connection || connection.closed) return false;

    const body = typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

    return this.writeRaw(
      connection,
      `event: ${eventName}\ndata: ${body}\n\n`
    );
  }

  matchesTopics(connection, topics = []) {
    if (!connection?.topics || connection.topics.size === 0) {
      return true;
    }

    const normalizedTopics = normalizeTopics(topics);
    if (normalizedTopics.length === 0) {
      return true;
    }

    return normalizedTopics.some((topic) => connection.topics.has(topic));
  }

  publishToUsers(userIds = [], payload, options = {}) {
    const targetIds = new Set(
      (Array.isArray(userIds) ? userIds : [userIds])
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    );

    if (targetIds.size === 0) {
      return 0;
    }

    const eventName = String(options.eventName || 'fluxy.realtime').trim() || 'fluxy.realtime';
    const topics = options.topics || [];
    let delivered = 0;

    for (const connection of this.connections.values()) {
      if (!targetIds.has(connection.userId)) continue;
      if (!this.matchesTopics(connection, topics)) continue;

      if (this.sendEvent(connection, eventName, payload)) {
        delivered += 1;
      }
    }

    return delivered;
  }
}

module.exports = new LiveUpdatesBroker();
