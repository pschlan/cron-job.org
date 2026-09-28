import React, { useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  TextField,
  Typography,
  makeStyles
} from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
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
import ChannelTypeTileGrid from './ChannelTypeTileGrid';
import WebhookPayloadField from './WebhookPayloadField';
import WebhookHeadersField, { headersToApi } from './WebhookHeadersField';
import WebhookPresetFields from './WebhookPresetFields';

const useStyles = makeStyles(theme => ({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
  },
  divider: {
    border: 0,
    borderTop: `1px solid ${theme.palette.divider}`,
    margin: 0
  },
  advanced: {
    margin: 0,
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    '&:before': {
      display: 'none'
    },
    '&.Mui-expanded': {
      margin: 0
    }
  },
  advancedSummary: {
    minHeight: 48,
    '&.Mui-expanded': {
      minHeight: 48
    }
  },
  advancedSummaryContent: {
    margin: `${theme.spacing(1)}px 0`,
    '&.Mui-expanded': {
      margin: `${theme.spacing(1)}px 0`
    }
  },
  advancedDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    paddingTop: 0
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
  const [ advancedOpen, setAdvancedOpen ] = useState(false);

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

  function selectChannelKind(kind) {
    setChannelKind(kind);
    setDestination('');
    setHeaders([]);
    setPayload(DEFAULT_WEBHOOK_PAYLOAD);
    setAdvancedOpen(false);
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
    return (
      <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
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
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth={isCustomWebhook && (advancedOpen || !isValidJson(payload)) ? 'md' : 'sm'}>
      <DialogTitle>{t('settings.notificationChannels.add')}</DialogTitle>
      <DialogContent className={classes.content}>
        <ChannelTypeTileGrid value={channelKind} onChange={selectChannelKind} />
        <hr className={classes.divider} />
        {isEmail && (
          <FormControl fullWidth>
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
              variant='outlined'
              size='small'
            />
          </FormControl>
        )}
        {isCustomWebhook && (
          <>
            <FormControl fullWidth>
              <TextField
                label={t('settings.notificationChannels.webhookUrl')}
                onChange={({target}) => setDestination(target.value)}
                value={destination}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
                autoFocus
                variant='outlined'
                size='small'
              />
            </FormControl>
            <Accordion
              className={classes.advanced}
              expanded={advancedOpen || !isValidJson(payload)}
              onChange={(_, expanded) => setAdvancedOpen(expanded)}
              elevation={0}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                classes={{
                  root: classes.advancedSummary,
                  content: classes.advancedSummaryContent
                }}
              >
                <Typography variant='body2'>{t('jobs.advanced')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.advancedDetails}>
                <WebhookHeadersField value={headers} onChange={setHeaders} />
                <WebhookPayloadField value={payload} onChange={setPayload} />
              </AccordionDetails>
            </Accordion>
          </>
        )}
        {isPreset && (
          <WebhookPresetFields
            presetId={channelKind}
            fields={presetFields[channelKind]}
            onChange={updatePresetFields}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onCloseHook.current}>
          {t('common.cancel')}
        </Button>
        <Button color='primary' onClick={() => createChannel()} disabled={!canCreate}>
          {t('settings.notificationChannels.add')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
