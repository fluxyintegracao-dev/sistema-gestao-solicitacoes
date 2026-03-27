const cacheStore = new Map();

function get(key) {
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
}

function set(key, value, ttlMs) {
  const ttl = Number(ttlMs);
  if (!Number.isFinite(ttl) || ttl <= 0) {
    cacheStore.delete(key);
    return value;
  }

  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });

  return value;
}

function del(key) {
  cacheStore.delete(key);
}

function clearPrefix(prefix) {
  for (const key of cacheStore.keys()) {
    if (String(key).startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

module.exports = {
  get,
  set,
  del,
  clearPrefix
};
