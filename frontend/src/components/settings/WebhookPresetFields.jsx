import React from 'react';
import { Box, FormControl, TextField, Typography, makeStyles } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { getWebhookPreset } from '../../utils/WebhookPresets';
import WebhookMessageTemplateField from './WebhookMessageTemplateField';

const useStyles = makeStyles(theme => ({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5)
  },
  hint: {
    marginBottom: theme.spacing(0.5)
  }
}));

const FIELD_META = {
  webhookUrl: { labelKey: 'webhookUrl', required: true },
  botToken: { labelKey: 'botToken', helpKey: 'botTokenHelp', required: true },
  chatId: { labelKey: 'chatId', helpKey: 'chatIdHelp', required: true },
  appToken: { labelKey: 'appToken', helpKey: 'appTokenHelp', required: true },
  userKey: { labelKey: 'userKey', helpKey: 'userKeyHelp', required: true },
  serverUrl: { labelKey: 'serverUrl', helpKey: 'serverUrlHelp', required: true },
  topic: { labelKey: 'topic', helpKey: 'topicHelp', required: true },
  accessToken: { labelKey: 'accessToken', helpKey: 'accessTokenHelp', required: false }
};

export default function WebhookPresetFields({ presetId, fields, onChange }) {
  const classes = useStyles();
  const { t } = useTranslation();
  const preset = getWebhookPreset(presetId);
  if (!preset) {
    return null;
  }

  function setField(name, value) {
    onChange({
      ...fields,
      [name]: value
    });
  }

  return (
    <Box className={classes.stack}>
      <Typography variant='body2' color='textSecondary' className={classes.hint}>
        {t(`settings.notificationChannels.presetHints.${presetId}`)}
      </Typography>
      {preset.fields.filter(name => name !== 'messageTemplate').map(name => {
        const meta = FIELD_META[name];
        if (!meta) {
          return null;
        }
        return (
          <FormControl fullWidth key={name}>
            <TextField
              label={t(`settings.notificationChannels.${meta.labelKey}`)}
              value={fields[name] || ''}
              onChange={({target}) => setField(name, target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={meta.helpKey ? t(`settings.notificationChannels.${meta.helpKey}`) : undefined}
              fullWidth
              required={meta.required}
              variant='outlined'
              size='small'
            />
          </FormControl>
        );
      })}
      <WebhookMessageTemplateField
        value={fields.messageTemplate || ''}
        onChange={value => setField('messageTemplate', value)}
      />
    </Box>
  );
}
