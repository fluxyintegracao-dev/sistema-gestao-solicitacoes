'use strict';

function pick(regex, value) {
  const match = String(value || '').match(regex);
  return match ? match[1] : null;
}

function parseRetornoEsocial(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return {
    protocolo: pick(/<protocolo[^>]*>([^<]+)<\/protocolo>/i, text) || pick(/<nrProt[^>]*>([^<]+)<\/nrProt>/i, text),
    recibo: pick(/<recibo[^>]*>([^<]+)<\/recibo>/i, text) || pick(/<nrRecibo[^>]*>([^<]+)<\/nrRecibo>/i, text),
    codigo: pick(/<codigo[^>]*>([^<]+)<\/codigo>/i, text) || pick(/<codResp[^>]*>([^<]+)<\/codResp>/i, text),
    descricao: pick(/<descricao[^>]*>([^<]+)<\/descricao>/i, text) || pick(/<dscResp[^>]*>([^<]+)<\/dscResp>/i, text),
    raw: text
  };
}

module.exports = {
  parseRetornoEsocial
};
