import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Link, makeStyles, Switch, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { updateNotificationChannel } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { isValidJson, NotificationChannelType, RegexPatterns } from '../../utils/Constants';
import {
  buildWebhookPreset,
  isKnownWebhookPreset,
  parseWebhookPreset,
  validateWebhookPreset
} from '../../utils/WebhookPresets';
import WebhookPayloadField from './WebhookPayloadField';
import WebhookHeadersField, { headersFromApi, headersToApi } from './WebhookHeadersField';
import WebhookPresetFields from './WebhookPresetFields';

const useStyles = makeStyles(theme => ({
  editDialog: {
    '& > *': {
      marginBottom: theme.spacing(2)
    }
  },
  escapeHatch: {
    display: 'block',
    marginTop: theme.spacing(1)
  }
}));

const WEBHOOK_URL_PATTERN = /^https?:\/\/.+/i;

export default function EditNotificationChannelDialog({ channel, accountEmail, onClose, onRefreshChannels }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshChannelsHook = useRef(onRefreshChannels, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const initialPreset = isKnownWebhookPreset(channel.preset) ? channel.preset : '';
  const [ destination, setDestination ] = useState(channel.destination || '');
  const [ enabled, setEnabled ] = useState(!!channel.enabled);
  const [ payload, setPayload ] = useState(channel.payload || '{}');
  const [ headers, setHeaders ] = useState(() => headersFromApi(channel.headers));
  const [ preset, setPreset ] = useState(initialPreset);
  const [ presetFields, setPresetFields ] = useState(() => (
    initialPreset ? parseWebhookPreset(initialPreset, channel) : null
  ));

  const isEmail = channel.type === NotificationChannelType.EMAIL;
  const isPresetMode = !isEmail && !!preset && !!presetFields;
  const usesAccountEmail = isEmail && destination.trim().toLowerCase() === (accountEmail || '').toLowerCase();

  let canSave = false;
  if (isEmail) {
    canSave = !!destination.match(RegexPatterns.email) && !usesAccountEmail;
  } else if (isPresetMode) {
    canSave = validateWebhookPreset(preset, presetFields);
  } else {
    canSave = !!destination.match(WEBHOOK_URL_PATTERN) && isValidJson(payload);
  }

  function editAsCustomWebhook() {
    if (isPresetMode) {
      const built = buildWebhookPreset(preset, presetFields);
      setDestination(built.destination);
      setPayload(built.payload);
      setHeaders(headersFromApi(built.headers));
    }
    setPreset('');
    setPresetFields(null);
  }

  function saveChannel() {
    if (!canSave) {
      return;
    }

    let nextDestination = destination.trim();
    let nextPayload = isEmail ? '' : payload;
    let nextHeaders = isEmail ? [] : headersToApi(headers);
    let nextPreset = '';

    if (isPresetMode) {
      const built = buildWebhookPreset(preset, presetFields);
      nextDestination = built.destination;
      nextPayload = built.payload;
      nextHeaders = built.headers;
      nextPreset = preset;
    }

    updateNotificationChannel(
      channel.channelId,
      nextDestination,
      enabled,
      nextPayload,
      nextHeaders,
      nextPreset
    )
      .then(() => {
        enqueueSnackbar(t('settings.notificationChannels.saved'), { variant: 'success' });
        onRefreshChannelsHook.current();
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('settings.notificationChannels.saveError'), { variant: 'error' });
      });
  }

  const typeLabel = isEmail
    ? t('settings.notificationChannels.types.email')
    : (isPresetMode
      ? t(`settings.notificationChannels.types.${preset}`)
      : t('settings.notificationChannels.types.webhook'));

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth={isEmail ? 'sm' : 'md'}>
    <DialogTitle>{t('settings.notificationChannels.editChannel')}</DialogTitle>
    <DialogContent className={classes.editDialog}>
      <FormControl fullWidth>
        <TextField
          label={t('settings.notificationChannels.type')}
          value={typeLabel}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled
        />
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
      {!isEmail && !isPresetMode && <>
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
      {isPresetMode && <>
        <WebhookPresetFields
          presetId={preset}
          fields={presetFields}
          onChange={setPresetFields}
        />
        <Link
          component='button'
          type='button'
          variant='body2'
          className={classes.escapeHatch}
          onClick={editAsCustomWebhook}
        >
          {t('settings.notificationChannels.editAsCustomWebhook')}
        </Link>
      </>}
      <FormControlLabel
        control={<Switch checked={enabled} onChange={({target}) => setEnabled(target.checked)} />}
        label={t('settings.notificationChannels.enabled')}
      />
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => saveChannel()} disabled={!canSave}>
        {t('common.save')}
      </Button>
    </DialogActions>
  </Dialog>;
}
