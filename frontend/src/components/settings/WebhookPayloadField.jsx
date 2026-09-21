import React, { useRef } from 'react';
import { Box, FormControl, Link, TextField, makeStyles } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { isValidJson, WEBHOOK_PAYLOAD_VARIABLES } from '../../utils/Constants';

const useStyles = makeStyles(theme => ({
  payload: {
    fontFamily: 'monospace',
    fontSize: '0.85rem'
  },
  variables: {
    marginTop: theme.spacing(0.5),
    lineHeight: 1.8
  },
  variable: {
    fontFamily: 'monospace',
    verticalAlign: 'baseline',
    cursor: 'pointer'
  }
}));

function placeholder(name) {
  return '${' + name + '}';
}

export default function WebhookPayloadField({ value, onChange }) {
  const classes = useStyles();
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const cursorRef = useRef({ start: value.length, end: value.length });
  const valid = isValidJson(value);

  function rememberCursor(event) {
    const el = event.target;
    cursorRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0
    };
  }

  function insertVariable(name) {
    const token = placeholder(name);
    const el = inputRef.current;
    const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : cursorRef.current.start;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : cursorRef.current.end;
    const next = value.slice(0, start) + token + value.slice(end);
    const pos = start + token.length;
    cursorRef.current = { start: pos, end: pos };
    onChange(next);
    requestAnimationFrame(() => {
      const field = inputRef.current;
      if (!field) {
        return;
      }
      field.focus();
      field.setSelectionRange(pos, pos);
    });
  }

  return <FormControl fullWidth>
    <TextField
      label={t('settings.notificationChannels.payload')}
      value={value}
      onChange={({target}) => onChange(target.value)}
      inputRef={inputRef}
      InputLabelProps={{ shrink: true }}
      InputProps={{ classes: { input: classes.payload } }}
      inputProps={{
        onSelect: rememberCursor,
        onKeyUp: rememberCursor,
        onClick: rememberCursor,
        onBlur: rememberCursor
      }}
      helperText={valid ? t('settings.notificationChannels.payloadHelp') : t('settings.notificationChannels.payloadInvalid')}
      error={!valid}
      fullWidth
      required
      multiline
      rows={8}
      />
    <Box className={classes.variables}>
      {WEBHOOK_PAYLOAD_VARIABLES.map((name, index) => <React.Fragment key={name}>
        {index > 0 && ' · '}
        <Link
          component='button'
          type='button'
          variant='caption'
          color='textSecondary'
          className={classes.variable}
          onMouseDown={event => event.preventDefault()}
          onClick={() => insertVariable(name)}
        >
          {placeholder(name)}
        </Link>
      </React.Fragment>)}
    </Box>
  </FormControl>;
}
