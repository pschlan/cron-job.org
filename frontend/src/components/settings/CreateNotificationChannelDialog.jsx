import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, makeStyles, MenuItem, Select, TextField } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { useTranslation } from 'react-i18next';
import { createNotificationChannel } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { DEFAULT_WEBHOOK_PAYLOAD, isValidJson, NotificationChannelType, RegexPatterns } from '../../utils/Constants';
import WebhookPayloadField from './WebhookPayloadField';

const useStyles = makeStyles(theme => ({
  createDialog: {
    '& > *': {
      marginBottom: theme.spacing(2)
    }
  }
}));

const WEBHOOK_URL_PATTERN = /^https?:\/\/.+/i;

export default function CreateNotificationChannelDialog({ accountEmail, onClose, onRefreshChannels }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshChannelsHook = useRef(onRefreshChannels, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ type, setType ] = useState(NotificationChannelType.WEBHOOK);
  const [ destination, setDestination ] = useState('');
  const [ payload, setPayload ] = useState(DEFAULT_WEBHOOK_PAYLOAD);
  const [ createdEmail, setCreatedEmail ] = useState(null);

  const isEmail = type === NotificationChannelType.EMAIL;
  const usesAccountEmail = isEmail && destination.trim().toLowerCase() === (accountEmail || '').toLowerCase();
  const destinationValid = isEmail
    ? !!destination.match(RegexPatterns.email) && !usesAccountEmail
    : !!destination.match(WEBHOOK_URL_PATTERN);
  const payloadValid = isEmail || isValidJson(payload);
  const canCreate = destinationValid && payloadValid;

  function createChannel() {
    if (!canCreate) {
      return;
    }
    const trimmedDestination = destination.trim();
    createNotificationChannel(type, trimmedDestination, true, isEmail ? '' : payload)
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

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.notificationChannels.add')}</DialogTitle>
    <DialogContent className={classes.createDialog}>
      <DialogContentText>
        {t('settings.notificationChannels.addText')}
      </DialogContentText>
      <FormControl fullWidth>
        <InputLabel shrink>{t('settings.notificationChannels.type')}</InputLabel>
        <Select
          value={type}
          onChange={({target}) => {
            setType(target.value);
            setDestination('');
          }}
        >
          <MenuItem value={NotificationChannelType.EMAIL}>{t('settings.notificationChannels.types.email')}</MenuItem>
          <MenuItem value={NotificationChannelType.WEBHOOK}>{t('settings.notificationChannels.types.webhook')}</MenuItem>
        </Select>
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
      {!isEmail && <WebhookPayloadField value={payload} onChange={setPayload} />}
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
