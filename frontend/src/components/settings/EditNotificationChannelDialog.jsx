import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, makeStyles, Switch, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { updateNotificationChannel } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { isValidJson, NotificationChannelType, RegexPatterns } from '../../utils/Constants';
import WebhookPayloadField from './WebhookPayloadField';

const useStyles = makeStyles(theme => ({
  editDialog: {
    '& > *': {
      marginBottom: theme.spacing(2)
    }
  }
}));

const WEBHOOK_URL_PATTERN = /^https?:\/\/.+/i;

export default function EditNotificationChannelDialog({ channel, accountEmail, onClose, onRefreshChannels }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshChannelsHook = useRef(onRefreshChannels, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ destination, setDestination ] = useState(channel.destination || '');
  const [ enabled, setEnabled ] = useState(!!channel.enabled);
  const [ payload, setPayload ] = useState(channel.payload || '{}');

  const isEmail = channel.type === NotificationChannelType.EMAIL;
  const usesAccountEmail = isEmail && destination.trim().toLowerCase() === (accountEmail || '').toLowerCase();
  const destinationValid = isEmail
    ? !!destination.match(RegexPatterns.email) && !usesAccountEmail
    : !!destination.match(WEBHOOK_URL_PATTERN);
  const payloadValid = isEmail || isValidJson(payload);
  const canSave = destinationValid && payloadValid;

  function saveChannel() {
    if (!canSave) {
      return;
    }
    updateNotificationChannel(channel.channelId, destination.trim(), enabled, isEmail ? '' : payload)
      .then(() => {
        enqueueSnackbar(t('settings.notificationChannels.saved'), { variant: 'success' });
        onRefreshChannelsHook.current();
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('settings.notificationChannels.saveError'), { variant: 'error' });
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.notificationChannels.editChannel')}</DialogTitle>
    <DialogContent className={classes.editDialog}>
      <FormControl fullWidth>
        <TextField
          label={t('settings.notificationChannels.type')}
          value={t('settings.notificationChannels.types.' + (isEmail ? 'email' : 'webhook'))}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled
        />
      </FormControl>
      <FormControl fullWidth>
        <TextField
          label={isEmail ? t('settings.notificationChannels.emailAddress') : t('settings.notificationChannels.webhookUrl')}
          onChange={({target}) => setDestination(target.value)}
          value={destination}
          InputLabelProps={{ shrink: true }}
          helperText={usesAccountEmail ? t('settings.notificationChannels.cannotUseAccountEmail') : undefined}
          error={usesAccountEmail}
          fullWidth
          required
          autoFocus
        />
      </FormControl>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={({target}) => setEnabled(target.checked)} />}
        label={t('settings.notificationChannels.enabled')}
      />
      {!isEmail && <WebhookPayloadField value={payload} onChange={setPayload} />}
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
