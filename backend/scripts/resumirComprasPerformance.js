const fs = require('fs');

const LOG_MARKER = '[COMPRAS_PERF] ';

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return 0;
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1);
  return Number(sortedValues[index] || 0);
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function parsePerformanceEntries(content) {
  return String(content || '')
    .split(/\r?\n/)
    .map((line) => {
      const markerIndex = line.indexOf(LOG_MARKER);
      if (markerIndex < 0) return null;
      const payload = line.slice(markerIndex + LOG_MARKER.length).trim();
      try {
        return JSON.parse(payload);
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

function summarizePerformanceEntries(entries) {
  const groups = new Map();

  for (const entry of entries || []) {
    const key = `${entry.method || 'GET'} ${entry.route || 'rota_desconhecida'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        requests: 0,
        errors: 0,
        aborted: 0,
        durations: [],
        queryCounts: [],
        databaseDurations: [],
        responseBytes: []
      });
    }

    const group = groups.get(key);
    group.requests += 1;
    if (Number(entry.status || 0) >= 400) group.errors += 1;
    if (entry.aborted) group.aborted += 1;
    group.durations.push(Number(entry.duration_ms || 0));
    group.queryCounts.push(Number(entry.db_query_count || 0));
    group.databaseDurations.push(Number(entry.db_duration_ms || 0));
    if (Number.isFinite(Number(entry.response_bytes))) {
      group.responseBytes.push(Number(entry.response_bytes));
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const durations = group.durations.sort((a, b) => a - b);
      const queryCounts = group.queryCounts.sort((a, b) => a - b);
      const databaseDurations = group.databaseDurations.sort((a, b) => a - b);
      const responseBytes = group.responseBytes.sort((a, b) => a - b);
      const average = (values) => values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;

      return {
        rota: group.key,
        requisicoes: group.requests,
        erros: group.errors,
        abortadas: group.aborted,
        tempo_medio_ms: round(average(durations)),
        tempo_p50_ms: round(percentile(durations, 50)),
        tempo_p95_ms: round(percentile(durations, 95)),
        tempo_max_ms: round(durations[durations.length - 1] || 0),
        consultas_media: round(average(queryCounts)),
        consultas_p95: round(percentile(queryCounts, 95)),
        consultas_max: round(queryCounts[queryCounts.length - 1] || 0),
        banco_medio_ms: round(average(databaseDurations)),
        banco_p95_ms: round(percentile(databaseDurations, 95)),
        resposta_media_kb: round(average(responseBytes) / 1024),
        resposta_p95_kb: round(percentile(responseBytes, 95) / 1024)
      };
    })
    .sort((a, b) => b.tempo_p95_ms - a.tempo_p95_ms || b.requisicoes - a.requisicoes);
}

function renderTable(summary) {
  if (!summary.length) {
    return 'Nenhuma metrica [COMPRAS_PERF] encontrada.';
  }

  const rows = summary.map((item) => ({
    rota: item.rota,
    req: item.requisicoes,
    erros: item.erros,
    p50_ms: item.tempo_p50_ms,
    p95_ms: item.tempo_p95_ms,
    max_ms: item.tempo_max_ms,
    sql_media: item.consultas_media,
    sql_p95: item.consultas_p95,
    db_p95_ms: item.banco_p95_ms,
    resp_p95_kb: item.resposta_p95_kb
  }));

  return rows;
}

function runCli() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const filePath = args.find((arg) => arg !== '--json');

  if (!filePath) {
    console.error('Uso: node scripts/resumirComprasPerformance.js <arquivo-de-log> [--json]');
    process.exitCode = 1;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const entries = parsePerformanceEntries(content);
  const summary = summarizePerformanceEntries(entries);

  if (asJson) {
    console.log(JSON.stringify({ registros: entries.length, rotas: summary }, null, 2));
    return;
  }

  console.log(`Registros analisados: ${entries.length}`);
  const table = renderTable(summary);
  if (typeof table === 'string') {
    console.log(table);
  } else {
    console.table(table);
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  parsePerformanceEntries,
  percentile,
  summarizePerformanceEntries
};
