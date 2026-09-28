import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, makeStyles, MenuItem, Select, TextField } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { useTranslation } from 'react-i18next';
import { createNotificationChannel } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { DEFAULT_WEBHOOK_PAYLOAD, isValidJson, NotificationChannelType, RegexPatterns } from '../../utils/Constants';
import {
  WEBHOOK_PRESET_IDS,
  buildWebhookPreset,
  getWebhookPreset,
  validateWebhookPreset
} from '../../utils/WebhookPresets';
import WebhookPayloadField from './WebhookPayloadField';
import WebhookHeadersField, { headersToApi } from './WebhookHeadersField';
import WebhookPresetFields from './WebhookPresetFields';

const useStyles = makeStyles(theme => ({
  createDialog: {
    '& > *': {
      marginBottom: theme.spacing(2)
    }
  }
}));

const WEBHOOK_URL_PATTERN = /^https?:\/\/.+/i;
const TYPE_EMAIL = 'email';
const TYPE_WEBHOOK = 'webhook';

export default function CreateNotificationChannelDialog({ accountEmail, onClose, onRefreshChannels }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshChannelsHook = useRef(onRefreshChannels, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ channelKind, setChannelKind ] = useState(TYPE_WEBHOOK);
  const [ destination, setDestination ] = useState('');
  const [ payload, setPayload ] = useState(DEFAULT_WEBHOOK_PAYLOAD);
  const [ headers, setHeaders ] = useState([]);
  const [ presetFields, setPresetFields ] = useState(() => {
    const initial = {};
    WEBHOOK_PRESET_IDS.forEach(id => {
      initial[id] = getWebhookPreset(id).defaultFields();
    });
    return initial;
  });
  const [ createdEmail, setCreatedEmail ] = useState(null);

  const isEmail = channelKind === TYPE_EMAIL;
  const isCustomWebhook = channelKind === TYPE_WEBHOOK;
  const isPreset = WEBHOOK_PRESET_IDS.includes(channelKind);
  const usesAccountEmail = isEmail && destination.trim().toLowerCase() === (accountEmail || '').toLowerCase();

  let canCreate = false;
  if (isEmail) {
    canCreate = !!destination.match(RegexPatterns.email) && !usesAccountEmail;
  } else if (isCustomWebhook) {
    canCreate = !!destination.match(WEBHOOK_URL_PATTERN) && isValidJson(payload);
  } else if (isPreset) {
    canCreate = validateWebhookPreset(channelKind, presetFields[channelKind]);
  }

  function updatePresetFields(next) {
    setPresetFields(prev => ({
      ...prev,
      [channelKind]: next
    }));
  }

  function createChannel() {
    if (!canCreate) {
      return;
    }

    let type = NotificationChannelType.WEBHOOK;
    let trimmedDestination = destination.trim();
    let channelPayload = payload;
    let channelHeaders = headersToApi(headers);
    let preset = '';

    if (isEmail) {
      type = NotificationChannelType.EMAIL;
      channelPayload = '';
      channelHeaders = [];
    } else if (isPreset) {
      const built = buildWebhookPreset(channelKind, presetFields[channelKind]);
      trimmedDestination = built.destination;
      channelPayload = built.payload;
      channelHeaders = built.headers;
      preset = channelKind;
    }

    createNotificationChannel(
      type,
      trimmedDestination,
      true,
      channelPayload,
      channelHeaders,
      preset
    )
      .then(() => {
        onRefreshChannelsHook.current();
        if (isEmail) {
          setCreatedEmail(trimmedDestination);
        } else {
          enqueueSnackbar(t('settings.notificationChannels.created'), { variant: 'success' });
          onCloseHook.current();
        }
      })
      .catch(error => {
        if (error.response && error.response.status === 429) {
          return;
        }
        enqueueSnackbar(t('settings.notificationChannels.createError'), { variant: 'error' });
      });
  }

  if (createdEmail) {
    return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
      <DialogTitle>{t('settings.notificationChannels.createdCheckInboxTitle')}</DialogTitle>
      <DialogContent>
        <Alert severity='info'>
          <AlertTitle>{t('settings.notificationChannels.createdCheckInboxTitle')}</AlertTitle>
          {t('settings.notificationChannels.createdCheckInbox', { email: createdEmail })}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button color='primary' autoFocus onClick={onCloseHook.current}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>;
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth={isEmail ? 'sm' : 'md'}>
    <DialogTitle>{t('settings.notificationChannels.add')}</DialogTitle>
    <DialogContent className={classes.createDialog}>
      <DialogContentText>
        {t('settings.notificationChannels.addText')}
      </DialogContentText>
      <FormControl fullWidth>
        <InputLabel shrink>{t('settings.notificationChannels.type')}</InputLabel>
        <Select
          value={channelKind}
          onChange={({target}) => {
            setChannelKind(target.value);
            setDestination('');
            setHeaders([]);
            setPayload(DEFAULT_WEBHOOK_PAYLOAD);
          }}
        >
          <MenuItem value={TYPE_EMAIL}>{t('settings.notificationChannels.types.email')}</MenuItem>
          <MenuItem value={TYPE_WEBHOOK}>{t('settings.notificationChannels.types.webhook')}</MenuItem>
          {WEBHOOK_PRESET_IDS.map(id => (
            <MenuItem key={id} value={id}>{t(`settings.notificationChannels.types.${id}`)}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {isEmail && <FormControl fullWidth>
        <TextField
          label={t('settings.notificationChannels.emailAddress')}
          onChange={({target}) => setDestination(target.value)}
          value={destination}
          InputLabelProps={{ shrink: true }}
          helperText={usesAccountEmail ? t('settings.notificationChannels.cannotUseAccountEmail') : undefined}
          error={usesAccountEmail}
          fullWidth
          required
          autoFocus
        />
      </FormControl>}
      {isCustomWebhook && <>
        <FormControl fullWidth>
          <TextField
            label={t('settings.notificationChannels.webhookUrl')}
            onChange={({target}) => setDestination(target.value)}
            value={destination}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
            autoFocus
          />
        </FormControl>
        <WebhookHeadersField value={headers} onChange={setHeaders} />
        <WebhookPayloadField value={payload} onChange={setPayload} />
      </>}
      {isPreset && <WebhookPresetFields
        presetId={channelKind}
        fields={presetFields[channelKind]}
        onChange={updatePresetFields}
      />}
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => createChannel()} disabled={!canCreate}>
        {t('settings.notificationChannels.add')}
      </Button>
    </DialogActions>
  </Dialog>;
}
