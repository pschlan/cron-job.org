const WEBHOOK_URL_PATTERN = /^https?:\/\/.+/i;
const MAX_DESTINATION_LENGTH = 255;

function placeholder(name) {
  return '${' + name + '}';
}

export const DEFAULT_MESSAGE_TEMPLATE = [
  placeholder('jobTitle') + ': ' + placeholder('notificationType'),
  placeholder('status'),
  placeholder('jobUrl')
].join('\n');

export const WEBHOOK_PRESET_IDS = [
  'slack',
  'discord',
  'teams',
  'telegram',
  'pushover',
  'mattermost',
  'googlechat',
  'ntfy'
];

function stringifyPayload(body) {
  return JSON.stringify(body, null, 2);
}

function parsePayloadJson(payload) {
  try {
    const parsed = JSON.parse(payload || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isHttpUrl(value) {
  return isNonEmpty(value) && WEBHOOK_URL_PATTERN.test(value.trim());
}

function joinServerTopic(server, topic) {
  const base = (server || 'https://ntfy.sh').trim().replace(/\/+$/, '');
  const cleanTopic = (topic || '').trim().replace(/^\/+/, '');
  return `${base}/${cleanTopic}`;
}

function headerValue(headers, key) {
  if (!Array.isArray(headers)) {
    return '';
  }
  const match = headers.find(h => (h.key || '').toLowerCase() === key.toLowerCase());
  return match ? match.value : '';
}

function bearerToken(headers) {
  const auth = headerValue(headers, 'Authorization');
  const match = /^Bearer\s+(.+)$/i.exec(auth || '');
  return match ? match[1] : '';
}

function urlPreset(id, textKey) {
  return {
    id,
    fields: ['webhookUrl', 'messageTemplate'],
    defaultFields() {
      return {
        webhookUrl: '',
        messageTemplate: DEFAULT_MESSAGE_TEMPLATE
      };
    },
    build(fields) {
      const messageTemplate = (fields.messageTemplate || '').trim();
      const body = {};
      body[textKey] = messageTemplate;
      return {
        destination: (fields.webhookUrl || '').trim(),
        payload: stringifyPayload(body),
        headers: []
      };
    },
    parse({ destination, payload }) {
      const parsed = parsePayloadJson(payload);
      let messageTemplate = DEFAULT_MESSAGE_TEMPLATE;
      if (parsed && typeof parsed[textKey] === 'string') {
        messageTemplate = parsed[textKey];
      }
      return {
        webhookUrl: destination || '',
        messageTemplate
      };
    },
    validate(fields) {
      return isHttpUrl(fields.webhookUrl)
        && (fields.webhookUrl || '').trim().length <= MAX_DESTINATION_LENGTH
        && isNonEmpty(fields.messageTemplate);
    }
  };
}

const slack = urlPreset('slack', 'text');
const discord = urlPreset('discord', 'content');
const mattermost = urlPreset('mattermost', 'text');
const googlechat = urlPreset('googlechat', 'text');

const teams = {
  ...urlPreset('teams', 'text'),
  build(fields) {
    const messageTemplate = (fields.messageTemplate || '').trim();
    return {
      destination: (fields.webhookUrl || '').trim(),
      payload: stringifyPayload({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: placeholder('jobTitle'),
        text: messageTemplate
      }),
      headers: []
    };
  }
};

const telegram = {
  id: 'telegram',
  fields: ['botToken', 'chatId', 'messageTemplate'],
  defaultFields() {
    return {
      botToken: '',
      chatId: '',
      messageTemplate: DEFAULT_MESSAGE_TEMPLATE
    };
  },
  build(fields) {
    const token = (fields.botToken || '').trim();
    const chatId = (fields.chatId || '').trim();
    const messageTemplate = (fields.messageTemplate || '').trim();
    return {
      destination: `https://api.telegram.org/bot${token}/sendMessage`,
      payload: stringifyPayload({
        chat_id: chatId,
        text: messageTemplate
      }),
      headers: []
    };
  },
  parse({ destination, payload }) {
    const parsed = parsePayloadJson(payload);
    const match = /^https?:\/\/api\.telegram\.org\/bot([^/]+)\/sendMessage\/?$/i.exec((destination || '').trim());
    return {
      botToken: match ? match[1] : '',
      chatId: parsed && parsed.chat_id != null ? String(parsed.chat_id) : '',
      messageTemplate: parsed && typeof parsed.text === 'string' ? parsed.text : DEFAULT_MESSAGE_TEMPLATE
    };
  },
  validate(fields) {
    const destination = `https://api.telegram.org/bot${(fields.botToken || '').trim()}/sendMessage`;
    return isNonEmpty(fields.botToken)
      && isNonEmpty(fields.chatId)
      && isNonEmpty(fields.messageTemplate)
      && destination.length <= MAX_DESTINATION_LENGTH;
  }
};

const pushover = {
  id: 'pushover',
  fields: ['appToken', 'userKey', 'messageTemplate'],
  defaultFields() {
    return {
      appToken: '',
      userKey: '',
      messageTemplate: DEFAULT_MESSAGE_TEMPLATE
    };
  },
  build(fields) {
    return {
      destination: 'https://api.pushover.net/1/messages.json',
      payload: stringifyPayload({
        token: (fields.appToken || '').trim(),
        user: (fields.userKey || '').trim(),
        title: placeholder('jobTitle'),
        message: (fields.messageTemplate || '').trim()
      }),
      headers: []
    };
  },
  parse({ payload }) {
    const parsed = parsePayloadJson(payload);
    return {
      appToken: parsed && typeof parsed.token === 'string' ? parsed.token : '',
      userKey: parsed && typeof parsed.user === 'string' ? parsed.user : '',
      messageTemplate: parsed && typeof parsed.message === 'string' ? parsed.message : DEFAULT_MESSAGE_TEMPLATE
    };
  },
  validate(fields) {
    return isNonEmpty(fields.appToken)
      && isNonEmpty(fields.userKey)
      && isNonEmpty(fields.messageTemplate);
  }
};

const ntfy = {
  id: 'ntfy',
  fields: ['serverUrl', 'topic', 'accessToken', 'messageTemplate'],
  defaultFields() {
    return {
      serverUrl: 'https://ntfy.sh',
      topic: '',
      accessToken: '',
      messageTemplate: DEFAULT_MESSAGE_TEMPLATE
    };
  },
  build(fields) {
    const serverUrl = (fields.serverUrl || 'https://ntfy.sh').trim() || 'https://ntfy.sh';
    const topic = (fields.topic || '').trim();
    const accessToken = (fields.accessToken || '').trim();
    const messageTemplate = (fields.messageTemplate || '').trim();
    const headers = [];
    if (accessToken) {
      headers.push({ key: 'Authorization', value: `Bearer ${accessToken}` });
    }
    return {
      destination: joinServerTopic(serverUrl, topic),
      payload: stringifyPayload({
        topic,
        title: placeholder('jobTitle'),
        message: messageTemplate
      }),
      headers
    };
  },
  parse({ destination, payload, headers }) {
    const parsed = parsePayloadJson(payload);
    let serverUrl = 'https://ntfy.sh';
    let topic = parsed && typeof parsed.topic === 'string' ? parsed.topic : '';
    const dest = (destination || '').trim().replace(/\/+$/, '');
    if (dest) {
      try {
        const url = new URL(dest);
        const path = url.pathname.replace(/^\/+|\/+$/g, '');
        serverUrl = `${url.protocol}//${url.host}`;
        if (!topic && path) {
          topic = path;
        }
      } catch (e) {
        // keep defaults
      }
    }
    return {
      serverUrl,
      topic,
      accessToken: bearerToken(headers),
      messageTemplate: parsed && typeof parsed.message === 'string' ? parsed.message : DEFAULT_MESSAGE_TEMPLATE
    };
  },
  validate(fields) {
    const destination = joinServerTopic(fields.serverUrl || 'https://ntfy.sh', fields.topic);
    return isHttpUrl(fields.serverUrl || 'https://ntfy.sh')
      && isNonEmpty(fields.topic)
      && isNonEmpty(fields.messageTemplate)
      && destination.length <= MAX_DESTINATION_LENGTH
      && isHttpUrl(destination);
  }
};

const PRESETS = {
  slack,
  discord,
  teams,
  telegram,
  pushover,
  mattermost,
  googlechat,
  ntfy
};

export function getWebhookPreset(id) {
  return PRESETS[id] || null;
}

export function isKnownWebhookPreset(id) {
  return !!getWebhookPreset(id);
}

export function buildWebhookPreset(id, fields) {
  const preset = getWebhookPreset(id);
  if (!preset) {
    return null;
  }
  return preset.build(fields || preset.defaultFields());
}

export function parseWebhookPreset(id, channel) {
  const preset = getWebhookPreset(id);
  if (!preset) {
    return null;
  }
  return {
    ...preset.defaultFields(),
    ...preset.parse({
      destination: channel.destination || '',
      payload: channel.payload || '{}',
      headers: channel.headers || []
    })
  };
}

export function validateWebhookPreset(id, fields) {
  const preset = getWebhookPreset(id);
  if (!preset) {
    return false;
  }
  return preset.validate(fields);
}

function maskWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    const tail = path.length <= 4 ? path : path.slice(-4);
    return `${parsed.host}/…${tail}`;
  } catch (e) {
    return '…';
  }
}

/** Safe public label for a channel destination (never includes Telegram bot tokens etc.). */
export function formatNotificationChannelIdentity(channel) {
  if (!channel) {
    return '';
  }
  if (!isKnownWebhookPreset(channel.preset)) {
    return channel.destination || '';
  }

  const fields = parseWebhookPreset(channel.preset, channel);
  switch (channel.preset) {
    case 'telegram':
      return fields.chatId || '';
    case 'pushover':
      return fields.userKey || '';
    case 'ntfy': {
      const topic = fields.topic || '';
      const server = (fields.serverUrl || '').replace(/\/+$/, '');
      if (topic && server && server !== 'https://ntfy.sh') {
        try {
          return `${new URL(server).host}/${topic}`;
        } catch (e) {
          return topic;
        }
      }
      return topic;
    }
    case 'slack':
    case 'discord':
    case 'teams':
    case 'mattermost':
    case 'googlechat':
      return maskWebhookUrl(fields.webhookUrl || channel.destination || '');
    default:
      return '';
  }
}
