import React, { useRef } from 'react';
import { FormControl, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import WebhookVariableChips from './WebhookVariableChips';

function placeholder(name) {
  return '${' + name + '}';
}

export default function WebhookMessageTemplateField({ value, onChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const cursorRef = useRef({ start: (value || '').length, end: (value || '').length });
  const valid = typeof value === 'string' && value.trim() !== '';

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

  return (
    <FormControl fullWidth>
      <TextField
        label={t('settings.notificationChannels.messageTemplate')}
        value={value}
        onChange={({target}) => onChange(target.value)}
        inputRef={inputRef}
        InputLabelProps={{ shrink: true }}
        inputProps={{
          onSelect: rememberCursor,
          onKeyUp: rememberCursor,
          onClick: rememberCursor,
          onBlur: rememberCursor
        }}
        helperText={valid
          ? t('settings.notificationChannels.messageTemplateHelp')
          : t('settings.notificationChannels.messageTemplateRequired')}
        error={!valid}
        fullWidth
        required
        multiline
        rows={4}
        variant='outlined'
      />
      <WebhookVariableChips onInsert={insertVariable} />
    </FormControl>
  );
}
