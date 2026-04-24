const { Op } = require('sequelize');
const {
  CrmChannel,
  CrmConversation,
  CrmConversationParticipant,
  CrmLead,
  CrmMessage,
  CrmPhoneAsset
} = require('../models');
const { registrarAuditCrm } = require('./crmService');

function digitsOnly(value) {
  return String(value || '').replace(/\D+/g, '');
}

function hasDigitsMatch(a, b) {
  const left = digitsOnly(a);
  const right = digitsOnly(b);
  if (!left || !right) return false;
  return left === right || left.endsWith(right) || right.endsWith(left);
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function previewText(value) {
  const text = normalizeText(value);
  return text.length > 255 ? `${text.slice(0, 252)}...` : text;
}

function providerLooksLike(value, target) {
  return normalizeText(value).toUpperCase().includes(String(target || '').toUpperCase());
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value != null && normalizeText(value) !== '') {
      return value;
    }
  }
  return null;
}

function buildMetaMessage(event, payload, lead) {
  const change = payload?.entry?.[0]?.changes?.[0]?.value || {};
  const parts = ['Lead recebido via Meta Ads'];
  if (event.campaign_name) parts.push(`Campanha: ${event.campaign_name}`);
  if (event.adset_name) parts.push(`Conjunto: ${event.adset_name}`);
  if (event.ad_name) parts.push(`Anuncio: ${event.ad_name}`);
  if (event.form_name) parts.push(`Formulario: ${event.form_name}`);
  if (lead?.nome) parts.push(`Lead: ${lead.nome}`);
  if (lead?.telefone) parts.push(`Telefone: ${lead.telefone}`);
  if (lead?.email) parts.push(`Email: ${lead.email}`);

  return {
    channelType: providerLooksLike(change?.field, 'whatsapp') ? 'WHATSAPP' : 'FORM',
    subject: firstNonEmpty(
      event.form_name && `Meta Ads • ${event.form_name}`,
      event.campaign_name && `Meta Ads • ${event.campaign_name}`,
      'Meta Ads'
    ),
    content: parts.join(' | '),
    contactName: firstNonEmpty(lead?.nome, change?.lead_name, change?.full_name),
    contactPhone: firstNonEmpty(lead?.telefone, change?.phone_number, change?.telefone),
    contactEmail: firstNonEmpty(lead?.email, change?.email),
    metadata: {
      provider: 'META',
      event_id: event.id,
      external_event_id: event.external_event_id || null,
      page_id: event.page_id || null,
      form_id: event.form_id || null,
      payload_excerpt: {
        field: change?.field || null,
        page_id: change?.page_id || null,
        form_id: change?.form_id || null,
        whatsapp_business_account_id: change?.whatsapp_business_account_id || null,
        phone_number_id: change?.phone_number_id || null
      }
    }
  };
}

function buildGoogleMessage(event, payload, lead) {
  const parts = ['Evento recebido via Google Ads'];
  if (event.campaign_name) parts.push(`Campanha: ${event.campaign_name}`);
  if (event.ad_group_name) parts.push(`Grupo: ${event.ad_group_name}`);
  if (event.asset_name) parts.push(`Ativo: ${event.asset_name}`);
  if (event.tracking_phone) parts.push(`Tracking: ${event.tracking_phone}`);
  if (event.destination_phone) parts.push(`Destino: ${event.destination_phone}`);
  if (lead?.nome) parts.push(`Lead: ${lead.nome}`);
  if (lead?.telefone) parts.push(`Contato: ${lead.telefone}`);

  return {
    channelType: event.tracking_phone || event.destination_phone ? 'PHONE' : 'FORM',
    subject: firstNonEmpty(
      event.campaign_name && `Google Ads • ${event.campaign_name}`,
      event.asset_name && `Google Ads • ${event.asset_name}`,
      'Google Ads'
    ),
    content: parts.join(' | '),
    contactName: firstNonEmpty(lead?.nome, payload?.name, payload?.nome),
    contactPhone: firstNonEmpty(
      lead?.telefone,
      payload?.caller_phone,
      payload?.caller_number,
      payload?.phone_number,
      payload?.caller_id
    ),
    contactEmail: firstNonEmpty(lead?.email, payload?.email),
    metadata: {
      provider: 'GOOGLE',
      event_id: event.id,
      external_event_id: event.external_event_id || null,
      tracking_phone: event.tracking_phone || null,
      destination_phone: event.destination_phone || null,
      payload_excerpt: {
        event_type: payload?.event_type || payload?.type || null,
        customer_id: payload?.customer_id || payload?.google_customer_id || null,
        tracking_number: payload?.tracking_number || null,
        destination_number: payload?.destination_number || null
      }
    }
  };
}

async function findChannelByProvider(provider, allowedTypes = []) {
  const where = { status: 'ACTIVE' };
  if (allowedTypes.length) where.type = { [Op.in]: allowedTypes };
  const channels = await CrmChannel.findAll({
    where,
    order: [['id', 'ASC']]
  });
  const providerChannels = channels.filter((item) => providerLooksLike(item.provider, provider));
  return providerChannels.length === 1 ? providerChannels[0] : null;
}

async function resolveMetaChannel(event, payload) {
  const change = payload?.entry?.[0]?.changes?.[0]?.value || {};
  const or = [];
  if (change?.whatsapp_business_account_id) {
    or.push({ meta_waba_id: String(change.whatsapp_business_account_id) });
  }
  if (change?.phone_number_id) {
    or.push({ meta_phone_number_id: String(change.phone_number_id) });
  }

  if (or.length) {
    const channel = await CrmChannel.findOne({
      where: {
        status: 'ACTIVE',
        [Op.or]: or
      },
      order: [['id', 'ASC']]
    });
    if (channel) return channel;
  }

  if (providerLooksLike(change?.field, 'whatsapp')) {
    return findChannelByProvider('META', ['WHATSAPP']);
  }

  return findChannelByProvider('META', ['FORM', 'WHATSAPP']);
}

async function resolveGoogleChannel(event, payload) {
  const or = [];
  if (payload?.customer_id || payload?.google_customer_id) {
    or.push({ google_customer_id: String(payload.customer_id || payload.google_customer_id) });
  }

  if (or.length) {
    const channel = await CrmChannel.findOne({
      where: {
        status: 'ACTIVE',
        [Op.or]: or
      },
      order: [['id', 'ASC']]
    });
    if (channel) return channel;
  }

  if (event.tracking_phone || event.destination_phone) {
    const allChannels = await CrmChannel.findAll({
      where: { status: 'ACTIVE', type: { [Op.in]: ['PHONE', 'FORM'] } },
      order: [['id', 'ASC']]
    });
    const matched = allChannels.find((item) => (
      hasDigitsMatch(item.tracking_phone, event.tracking_phone) ||
      hasDigitsMatch(item.destination_phone, event.destination_phone) ||
      hasDigitsMatch(item.operational_phone, event.tracking_phone) ||
      hasDigitsMatch(item.business_main_phone, event.destination_phone)
    ));
    if (matched) return matched;
  }

  return findChannelByProvider('GOOGLE', ['PHONE', 'FORM']);
}

async function resolvePhoneAsset({
  provider,
  incomingChannel,
  contactPhone,
  trackingPhone,
  destinationPhone
}) {
  const assets = await CrmPhoneAsset.findAll({
    where: { status: 'ACTIVE' },
    order: [['id', 'ASC']]
  });

  const providerFlag =
    provider === 'META'
      ? (item) => item.is_meta_ads_enabled
      : provider === 'GOOGLE'
        ? (item) => item.is_google_ads_enabled
        : () => true;

  const candidates = assets.filter((item) => providerFlag(item));

  const channelNumbers = [
    incomingChannel?.tracking_phone,
    incomingChannel?.destination_phone,
    incomingChannel?.operational_phone,
    incomingChannel?.business_main_phone
  ].filter(Boolean);

  const preferredNumbers = [
    trackingPhone,
    destinationPhone,
    ...channelNumbers,
    contactPhone
  ].filter(Boolean);

  for (const number of preferredNumbers) {
    const matched = candidates.find((item) => (
      hasDigitsMatch(item.phone_number, number) ||
      hasDigitsMatch(item.forward_to_phone, number)
    ));
    if (matched) return matched;
  }

  return null;
}

async function findOrCreateConversation({
  lead,
  channel,
  phoneAsset,
  channelType,
  subject,
  contactName,
  contactPhone,
  contactEmail
}) {
  const where = {
    channel_type: channelType,
    status: { [Op.in]: ['OPEN', 'PENDING', 'RESOLVED'] }
  };

  if (lead?.id) where.lead_id = lead.id;
  if (channel?.id) where.channel_id = channel.id;
  if (phoneAsset?.id) where.phone_asset_id = phoneAsset.id;

  let conversation = await CrmConversation.findOne({
    where,
    order: [['last_message_at', 'DESC'], ['updatedAt', 'DESC'], ['createdAt', 'DESC']]
  });

  if (!conversation && lead?.id) {
    conversation = await CrmConversation.findOne({
      where: {
        lead_id: lead.id,
        channel_type: channelType,
        status: { [Op.in]: ['OPEN', 'PENDING', 'RESOLVED'] }
      },
      order: [['last_message_at', 'DESC'], ['updatedAt', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  if (!conversation) {
    conversation = await CrmConversation.create({
      lead_id: lead?.id || null,
      channel_id: channel?.id || null,
      phone_asset_id: phoneAsset?.id || null,
      assigned_user_id: lead?.assigned_user_id || null,
      channel_type: channelType,
      status: 'OPEN',
      priority: 'MEDIUM',
      contact_name: firstNonEmpty(contactName, lead?.nome),
      contact_phone: firstNonEmpty(contactPhone, lead?.telefone),
      contact_email: firstNonEmpty(contactEmail, lead?.email),
      subject: subject || null,
      created_by_user_id: null
    });
  } else {
    const updates = {};
    if (!conversation.channel_id && channel?.id) updates.channel_id = channel.id;
    if (!conversation.phone_asset_id && phoneAsset?.id) updates.phone_asset_id = phoneAsset.id;
    if (!conversation.assigned_user_id && lead?.assigned_user_id) updates.assigned_user_id = lead.assigned_user_id;
    if (!conversation.contact_name && contactName) updates.contact_name = contactName;
    if (!conversation.contact_phone && contactPhone) updates.contact_phone = contactPhone;
    if (!conversation.contact_email && contactEmail) updates.contact_email = contactEmail;
    if (!conversation.subject && subject) updates.subject = subject;
    if (conversation.status === 'RESOLVED') {
      updates.status = 'OPEN';
      updates.closed_at = null;
    }
    if (Object.keys(updates).length) {
      await conversation.update(updates);
      await conversation.reload();
    }
  }

  if (conversation.assigned_user_id) {
    await CrmConversationParticipant.findOrCreate({
      where: {
        conversation_id: conversation.id,
        user_id: conversation.assigned_user_id
      },
      defaults: { role: 'OWNER' }
    });
  }

  return conversation;
}

async function findOrCreateIntegrationMessage({
  provider,
  event,
  conversation,
  lead,
  content,
  metadata
}) {
  const externalMessageId = `${provider.toLowerCase()}-event:${event.id}`;
  let message = await CrmMessage.findOne({
    where: { external_message_id: externalMessageId }
  });

  if (!message) {
    message = await CrmMessage.create({
      conversation_id: conversation.id,
      lead_id: lead?.id || conversation.lead_id || null,
      user_id: null,
      external_message_id: externalMessageId,
      sender_type: 'SYSTEM',
      direction: 'INBOUND',
      message_type: 'EVENT',
      content,
      metadata_json: metadata || null,
      read_at: null
    });

    await conversation.update({
      lead_id: conversation.lead_id || lead?.id || null,
      assigned_user_id: conversation.assigned_user_id || lead?.assigned_user_id || null,
      contact_name: conversation.contact_name || lead?.nome || null,
      contact_phone: conversation.contact_phone || lead?.telefone || null,
      contact_email: conversation.contact_email || lead?.email || null,
      last_message_preview: previewText(content),
      last_message_at: event.received_at || message.createdAt || new Date(),
      unread_count: Number(conversation.unread_count || 0) + 1,
      status: conversation.status === 'ARCHIVED' ? 'OPEN' : conversation.status
    });

    if (lead?.id) {
      await CrmLead.update(
        { ultima_interacao_at: event.received_at || new Date() },
        { where: { id: lead.id } }
      );
    }
  }

  return message;
}

async function syncIntegrationEventToInbox({
  provider,
  event,
  lead,
  req,
  channelResolver,
  phoneResolverInput,
  messageBuilder
}) {
  if (!event || !lead) {
    return { conversation: null, message: null };
  }

  const payload = event.payload_json || {};
  const builtMessage = messageBuilder(event, payload, lead);
  const channel = await channelResolver(event, payload);
  const phoneAsset = await resolvePhoneAsset({
    provider,
    incomingChannel: channel,
    contactPhone: builtMessage.contactPhone,
    ...phoneResolverInput(event, payload, lead)
  });

  const conversation = await findOrCreateConversation({
    lead,
    channel,
    phoneAsset,
    channelType: builtMessage.channelType,
    subject: builtMessage.subject,
    contactName: builtMessage.contactName,
    contactPhone: builtMessage.contactPhone,
    contactEmail: builtMessage.contactEmail
  });

  const message = await findOrCreateIntegrationMessage({
    provider,
    event,
    conversation,
    lead,
    content: builtMessage.content,
    metadata: builtMessage.metadata
  });

  await registrarAuditCrm({
    leadId: lead.id,
    userId: null,
    eventType: `${provider}_INTEGRATION_INBOX_SYNC`,
    metadata: {
      provider,
      event_id: event.id,
      conversation_id: conversation.id,
      message_id: message.id
    },
    req
  });

  return { conversation, message };
}

async function sincronizarMetaNoInbox(event, lead, req) {
  return syncIntegrationEventToInbox({
    provider: 'META',
    event,
    lead,
    req,
    channelResolver: resolveMetaChannel,
    phoneResolverInput: () => ({ trackingPhone: null, destinationPhone: null }),
    messageBuilder: buildMetaMessage
  });
}

async function sincronizarGoogleNoInbox(event, lead, req) {
  return syncIntegrationEventToInbox({
    provider: 'GOOGLE',
    event,
    lead,
    req,
    channelResolver: resolveGoogleChannel,
    phoneResolverInput: (item) => ({
      trackingPhone: item.tracking_phone,
      destinationPhone: item.destination_phone
    }),
    messageBuilder: buildGoogleMessage
  });
}

module.exports = {
  sincronizarMetaNoInbox,
  sincronizarGoogleNoInbox
};
