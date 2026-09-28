import React from 'react';
import { Box, Button, FormLabel, IconButton, makeStyles, TextField, Typography } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles(theme => ({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1)
  },
  sectionTitle: {
    fontWeight: 500
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr) auto',
    gap: theme.spacing(1),
    alignItems: 'center'
  },
  empty: {
    fontStyle: 'italic',
    color: theme.palette.text.secondary
  },
  addRow: {
    display: 'flex',
    justifyContent: 'flex-start'
  }
}));

let nextHeaderId = 0;
function newHeaderId() {
  return `wh-header-${++nextHeaderId}`;
}

export function headersFromApi(headers) {
  if (!Array.isArray(headers)) {
    return [];
  }
  return headers
    .filter(h => h && typeof h.key === 'string' && typeof h.value === 'string')
    .map(h => ({ key: h.key, value: h.value, uuid: newHeaderId() }));
}

export function headersToApi(headers) {
  return (headers || [])
    .map(h => ({ key: (h.key || '').trim(), value: (h.value || '').trim() }))
    .filter(h => h.key !== '' && h.value !== '');
}

export default function WebhookHeadersField({ value, onChange }) {
  const classes = useStyles();
  const { t } = useTranslation();
  const headers = Array.isArray(value) ? value : [];

  function deleteHeader(rowNo) {
    onChange(headers.filter((_, index) => index !== rowNo));
  }

  function addHeader() {
    onChange([...headers, { key: '', value: '', uuid: newHeaderId() }]);
  }

  function updateHeaderKey(rowNo, key) {
    key = key.trim();
    if (key.endsWith(':')) {
      key = key.substring(0, key.length - 1).trim();
    }
    onChange(headers.map((x, index) => index === rowNo ? { ...x, key } : x));
  }

  function updateHeaderValue(rowNo, headerValue) {
    onChange(headers.map((x, index) => index === rowNo ? { ...x, value: headerValue.trim() } : x));
  }

  return (
    <Box className={classes.section}>
      <FormLabel className={classes.sectionTitle}>{t('jobs.headers')}</FormLabel>
      {headers.length === 0 && (
        <Typography variant='body2' className={classes.empty}>
          {t('jobs.noheaders')}
        </Typography>
      )}
      {headers.map((item, rowNo) => (
        <Box key={item.uuid} className={classes.row}>
          <TextField
            variant='outlined'
            label={t('jobs.key')}
            size='small'
            defaultValue={item.key}
            onBlur={({target}) => updateHeaderKey(rowNo, target.value)}
            fullWidth
          />
          <TextField
            variant='outlined'
            label={t('jobs.value')}
            size='small'
            defaultValue={item.value}
            onBlur={({target}) => updateHeaderValue(rowNo, target.value)}
            fullWidth
          />
          <IconButton
            size='small'
            onClick={() => deleteHeader(rowNo)}
            title={t('common.delete')}
            aria-label={t('common.delete')}
          >
            <DeleteIcon fontSize='small' />
          </IconButton>
        </Box>
      ))}
      <Box className={classes.addRow}>
        <Button
          size='small'
          startIcon={<AddIcon />}
          onClick={() => addHeader()}
        >
          {t('common.add')}
        </Button>
      </Box>
    </Box>
  );
}
