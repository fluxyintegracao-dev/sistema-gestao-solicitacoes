'use strict';

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function flattenRows(rows = []) {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return { valor: row };
    return Object.entries(row).reduce((acc, [key, value]) => {
      acc[key] = value && typeof value === 'object' ? JSON.stringify(value) : value;
      return acc;
    }, {});
  });
}

function toCsv(rows = []) {
  const normalized = flattenRows(rows);
  const headers = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));
  const lines = [headers.join(';')];
  normalized.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(';'));
  });
  return lines.join('\n');
}

function toExcelHtml(rows = [], title = 'Governanca do Sistema') {
  const normalized = flattenRows(rows);
  const headers = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));
  const cells = (value, tag = 'td') => `<${tag}>${String(value ?? '').replace(/[<>&]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char]))}</${tag}>`;
  return [
    '<html><head><meta charset="utf-8" /></head><body>',
    `<h1>${title}</h1>`,
    '<table border="1"><thead><tr>',
    headers.map((header) => cells(header, 'th')).join(''),
    '</tr></thead><tbody>',
    normalized.map((row) => `<tr>${headers.map((header) => cells(row[header])).join('')}</tr>`).join(''),
    '</tbody></table></body></html>'
  ].join('');
}

function buildPdf(rows = [], title = 'Governanca do Sistema') {
  const text = [
    title,
    `Gerado em: ${new Date().toISOString()}`,
    '',
    ...flattenRows(rows).slice(0, 80).map((row) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(' | '))
  ].join('\n').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

  const stream = `BT /F1 10 Tf 40 780 Td ${text
    .split('\n')
    .map((line) => `(${line.replace(/[()\\]/g, '\\$&')}) Tj T*`)
    .join('\n')} ET`;

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(body));
    body += `${object}\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, 'utf8');
}

function buildExport({ rows, format, title }) {
  const normalizedFormat = String(format || 'csv').toLowerCase();
  if (normalizedFormat === 'xlsx' || normalizedFormat === 'xls' || normalizedFormat === 'excel') {
    return {
      body: toExcelHtml(rows, title),
      contentType: 'application/vnd.ms-excel; charset=utf-8',
      filename: 'governanca-sistema.xls'
    };
  }
  if (normalizedFormat === 'pdf') {
    return {
      body: buildPdf(rows, title),
      contentType: 'application/pdf',
      filename: 'governanca-sistema.pdf'
    };
  }
  return {
    body: toCsv(rows),
    contentType: 'text/csv; charset=utf-8',
    filename: 'governanca-sistema.csv'
  };
}

module.exports = {
  buildExport
};
