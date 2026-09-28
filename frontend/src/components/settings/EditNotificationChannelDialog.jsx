import React, { useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Link,
  Switch,
  TextField,
  Typography,
  makeStyles
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
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
import { notificationChannelTypeIcon } from './NotificationChannelTypeIcon';
import WebhookPayloadField from './WebhookPayloadField';
import WebhookHeadersField, { headersFromApi, headersToApi } from './WebhookHeadersField';
import WebhookPresetFields from './WebhookPresetFields';

const useStyles = makeStyles(theme => ({
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    paddingRight: theme.spacing(1)
  },
  titleMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    minWidth: 0
  },
  identity: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    alignSelf: 'flex-start',
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.secondary
  },
  identityIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    '& > svg': {
      fontSize: 18
    }
  },
  enabledSwitch: {
    marginRight: 0,
    flexShrink: 0
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2)
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
  },
  escapeHatch: {
    alignSelf: 'flex-start'
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
  const [ advancedOpen, setAdvancedOpen ] = useState(false);

  const isEmail = channel.type === NotificationChannelType.EMAIL;
  const isPresetMode = !isEmail && !!preset && !!presetFields;
  const isCustomWebhook = !isEmail && !isPresetMode;
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
    setAdvancedOpen(true);
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

  const typeKind = isEmail
    ? 'email'
    : (isPresetMode ? preset : 'webhook');
  const typeLabel = t(`settings.notificationChannels.types.${typeKind}`);

  return (
    <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth={isCustomWebhook && (advancedOpen || !isValidJson(payload)) ? 'md' : 'sm'}>
      <DialogTitle disableTypography>
        <Box className={classes.titleRow}>
          <Box className={classes.titleMain}>
            <Typography variant='h6'>{t('settings.notificationChannels.editChannel')}</Typography>
            <Box className={classes.identity}>
              <span className={classes.identityIcon} aria-hidden='true'>
                {notificationChannelTypeIcon(typeKind)}
              </span>
              <Typography variant='body2' component='span'>{typeLabel}</Typography>
            </Box>
          </Box>
          <FormControlLabel
            className={classes.enabledSwitch}
            control={<Switch checked={enabled} onChange={({target}) => setEnabled(target.checked)} color='primary' />}
            label={t('settings.notificationChannels.enabled')}
            labelPlacement='start'
          />
        </Box>
      </DialogTitle>
      <DialogContent className={classes.content}>
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
        {isPresetMode && (
          <>
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
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onCloseHook.current}>
          {t('common.cancel')}
        </Button>
        <Button color='primary' onClick={() => saveChannel()} disabled={!canSave}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
