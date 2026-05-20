'use strict';

function stripCdata(value = '') {
  return String(value || '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeXmlEntities(value = '') {
  return stripCdata(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function pickTag(xml, tagName) {
  const escaped = escapeRegExp(tagName);
  const pattern = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${escaped}(?=[\\s>/])[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${escaped}>`, 'i');
  const match = String(xml || '').match(pattern);
  return match ? decodeXmlEntities(match[1]) : null;
}

function pickBlock(xml, tagName) {
  const escaped = escapeRegExp(tagName);
  const pattern = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${escaped}(?=[\\s>/])[^>]*>[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?${escaped}>`, 'i');
  const match = String(xml || '').match(pattern);
  return match ? match[0] : '';
}

function pickBlocks(xml, tagName) {
  const escaped = escapeRegExp(tagName);
  const pattern = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${escaped}(?=[\\s>/])[^>]*>[\\s\\S]*?<\\/(?:[A-Za-z_][\\w.-]*:)?${escaped}>`, 'gi');
  return String(xml || '').match(pattern) || [];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function parseDecimal(value) {
  const normalized = String(value || '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractAccessKey(xml) {
  const chNFe = onlyDigits(pickTag(xml, 'chNFe'));
  if (/^\d{44}$/.test(chNFe)) return chNFe;

  const idMatch = String(xml || '').match(/\bId=["']NFe(\d{44})["']/i);
  if (idMatch) return idMatch[1];

  const protMatch = String(xml || '').match(/\bchNFe=["']?(\d{44})["']?/i);
  if (protMatch) return protMatch[1];

  return null;
}

function parseNfeItems(raw) {
  return pickBlocks(raw, 'det').map((detBlock, index) => {
    const prodBlock = pickBlock(detBlock, 'prod');
    const nItem = String(detBlock.match(/\bnItem=["']([^"']+)["']/i)?.[1] || index + 1).trim();

    return {
      nItem,
      cProd: pickTag(prodBlock, 'cProd') || null,
      xProd: pickTag(prodBlock, 'xProd') || null,
      NCM: pickTag(prodBlock, 'NCM') || null,
      CFOP: pickTag(prodBlock, 'CFOP') || null,
      uCom: pickTag(prodBlock, 'uCom') || null,
      qCom: parseDecimal(pickTag(prodBlock, 'qCom')),
      vUnCom: parseDecimal(pickTag(prodBlock, 'vUnCom')),
      vProd: parseDecimal(pickTag(prodBlock, 'vProd'))
    };
  });
}

function countNfeItemBlocks(raw) {
  return pickBlocks(raw, 'det').length;
}

function parseNfeXml(xml) {
  const raw = String(xml || '');
  const accessKey = extractAccessKey(raw);
  if (!accessKey) {
    const error = new Error('Nao foi possivel identificar a chave de acesso da NFe no XML.');
    error.statusCode = 400;
    error.code = 'NFE_ACCESS_KEY_NOT_FOUND';
    throw error;
  }

  const emitBlock = pickBlock(raw, 'emit');
  const destBlock = pickBlock(raw, 'dest');
  const totalBlock = pickBlock(raw, 'ICMSTot') || pickBlock(raw, 'total');

  const issuerCnpj = onlyDigits(pickTag(emitBlock, 'CNPJ') || pickTag(emitBlock, 'CPF'));
  const recipientCnpj = onlyDigits(pickTag(destBlock, 'CNPJ') || pickTag(destBlock, 'CPF'));
  const emissionValue = pickTag(raw, 'dhEmi') || pickTag(raw, 'dEmi');
  const totalValue = parseDecimal(pickTag(totalBlock, 'vNF'));
  const items = parseNfeItems(raw);

  return {
    access_key: accessKey,
    schema_version: String(raw.match(/\bversao=["']([^"']+)["']/i)?.[1] || '').trim() || null,
    issuer_cnpj: issuerCnpj || null,
    issuer_name: pickTag(emitBlock, 'xNome') || null,
    recipient_cnpj: recipientCnpj || null,
    recipient_name: pickTag(destBlock, 'xNome') || null,
    emission_date: parseDate(emissionValue),
    total_value: totalValue,
    document_number: pickTag(raw, 'nNF') || null,
    series: pickTag(raw, 'serie') || null,
    operation_nature: pickTag(raw, 'natOp') || null,
    sefaz_status_code: pickTag(raw, 'cStat') || null,
    sefaz_status_description: pickTag(raw, 'xMotivo') || null,
    parsed_xml_json: {
      infNFe: {
        access_key: accessKey,
        natOp: pickTag(raw, 'natOp') || null,
        nNF: pickTag(raw, 'nNF') || null,
        serie: pickTag(raw, 'serie') || null,
        dhEmi: emissionValue || null,
        vNF: totalValue
      },
      emit: {
        cnpj: issuerCnpj || null,
        name: pickTag(emitBlock, 'xNome') || null,
        ie: pickTag(emitBlock, 'IE') || null,
        uf: pickTag(pickBlock(emitBlock, 'enderEmit'), 'UF') || null
      },
      dest: {
        cnpj: recipientCnpj || null,
        name: pickTag(destBlock, 'xNome') || null,
        ie: pickTag(destBlock, 'IE') || null,
        uf: pickTag(pickBlock(destBlock, 'enderDest'), 'UF') || null
      },
      protNFe: {
        cStat: pickTag(raw, 'cStat') || null,
        xMotivo: pickTag(raw, 'xMotivo') || null,
        nProt: pickTag(raw, 'nProt') || null
      },
      item_count: items.length,
      items
    }
  };
}

module.exports = {
  countNfeItemBlocks,
  parseNfeXml
};
