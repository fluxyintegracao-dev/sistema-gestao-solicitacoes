'use strict';

const accessKey = '12345678901234567890123456789012345678901234';
const summaryAccessKey = '98765432109876543210987654321098765432109876';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe${accessKey}" versao="4.00">
      <ide>
        <natOp>VENDA DE MERCADORIA</natOp>
        <serie>1</serie>
        <nNF>1001</nNF>
        <dhEmi>2026-05-19T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>11222333000144</CNPJ>
        <xNome>Fornecedor Fiscal Teste LTDA</xNome>
        <enderEmit><UF>ES</UF></enderEmit>
      </emit>
      <dest>
        <CNPJ>55666777000188</CNPJ>
        <xNome>Empresa Monitorada Teste SPE LTDA</xNome>
        <enderDest><UF>ES</UF></enderDest>
      </dest>
      <total>
        <ICMSTot>
          <vNF>1234.56</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>${accessKey}</chNFe>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
      <nProt>135260000000001</nProt>
    </infProt>
  </protNFe>
</nfeProc>`;

module.exports = {
  company: {
    id: 1,
    cnpj: '55666777000188',
    razao_social: 'Empresa Monitorada Teste SPE LTDA',
    uf: 'ES',
    ambiente_sefaz: 'homologacao'
  },
  response: {
    ult_nsu: '10',
    max_nsu: '20',
    response_code: '138',
    response_message: 'Documento localizado para teste local',
    documents: [
      {
        nsu: '10',
        document_type: 'nfe',
        xml,
        events: [
          {
            event_type: 'autorizacao',
            event_sequence: '1',
            event_protocol: '135260000000001',
            event_date: '2026-05-19T10:01:00-03:00',
            event_description: 'Autorizado o uso da NF-e'
          }
        ]
      },
      {
        nsu: '11',
        document_type: 'nfe',
        access_key: summaryAccessKey,
        summary: {
          nsu: '11',
          access_key: summaryAccessKey,
          schema_version: 'resNFe_v1.01',
          issuer_cnpj: '99888777000166',
          issuer_name: 'Fornecedor Somente Resumo LTDA',
          recipient_cnpj: '55666777000188',
          recipient_name: 'Empresa Monitorada Teste SPE LTDA',
          emission_date: '2026-05-18T09:00:00-03:00',
          total_value: 789.1,
          document_number: '2002',
          series: '2',
          operation_nature: 'VENDA RESUMIDA',
          sefaz_status_code: '100',
          sefaz_status_description: 'Resumo recebido',
          manifestation_status: 'pending'
        }
      }
    ]
  }
};
