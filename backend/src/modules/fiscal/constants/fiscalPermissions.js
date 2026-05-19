'use strict';

const FISCAL_PERMISSIONS = {
  VIEW: 'fiscal.view',
  CONFIG_MANAGE: 'fiscal.config.manage',
  DOCUMENT_VIEW: 'fiscal.document.view',
  DOCUMENT_LINK: 'fiscal.document.link',
  SYNC_VIEW: 'fiscal.sync.view',
  LOGS_VIEW: 'fiscal.logs.view'
};

const FISCAL_PERMISSION_KEYS = Object.values(FISCAL_PERMISSIONS);

const FISCAL_DOCUMENT_TYPES = ['nfe', 'cte', 'nfse'];
const FISCAL_AMBIENTES_SEFAZ = ['homologacao', 'producao'];
const FISCAL_SYNC_STATUSES = ['idle', 'syncing', 'blocked', 'error'];
const FISCAL_DOCUMENT_STATUSES = [
  'discovered',
  'summary_received',
  'awaiting_manifestation',
  'manifestation_sent',
  'full_xml_available',
  'xml_downloaded',
  'pending_link',
  'linked_to_order',
  'with_divergence',
  'validated',
  'sent_to_finance',
  'exported_to_accounting',
  'cancelled',
  'ignored'
];

module.exports = {
  FISCAL_AMBIENTES_SEFAZ,
  FISCAL_DOCUMENT_STATUSES,
  FISCAL_DOCUMENT_TYPES,
  FISCAL_PERMISSIONS,
  FISCAL_PERMISSION_KEYS,
  FISCAL_SYNC_STATUSES
};
