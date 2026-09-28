import React from 'react';
import { Box, Button, FormLabel, Grid, IconButton, makeStyles, TableContainer, TextField } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import { useTranslation } from 'react-i18next';
import Table from '../misc/Table';

const useStyles = makeStyles(theme => ({
  fieldSet: {
    margin: 0,
    padding: theme.spacing(1.5, 1.5, 1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(0.5),
    '& legend': {
      padding: theme.spacing(0, 0.5)
    }
  },
  headersTable: {
    '& .MuiTextField-root': {
      margin: theme.spacing(0)
    }
  },
  tableContainer: {
    marginBottom: theme.spacing(1)
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

  const columns = [
    {
      cell: (item, rowNo) => <TextField
        variant='filled'
        label={t('jobs.key')}
        size='small'
        defaultValue={item.key}
        onBlur={({target}) => updateHeaderKey(rowNo, target.value)}
        fullWidth />
    },
    {
      cell: (item, rowNo) => <TextField
        variant='filled'
        label={t('jobs.value')}
        size='small'
        defaultValue={item.value}
        onBlur={({target}) => updateHeaderValue(rowNo, target.value)}
        fullWidth />
    },
    {
      cell: (item, rowNo) => <IconButton
        size='small'
        onClick={() => deleteHeader(rowNo)}
        title={t('common.delete')}
        aria-label={t('common.delete')}>
        <DeleteIcon />
      </IconButton>
    }
  ];

  return <Box component='fieldset' className={classes.fieldSet}>
    <FormLabel component='legend'>{t('jobs.headers')}</FormLabel>
    <TableContainer className={classes.tableContainer}>
      <Table
        size='small'
        className={classes.headersTable}
        columns={columns}
        items={headers}
        empty={<em>{t('jobs.noheaders')}</em>}
        rowIdentifier='uuid'
        noHeader
      />
    </TableContainer>
    <Grid container direction='row' justifyContent='flex-end'>
      <Grid item>
        <Button
          variant='contained'
          size='small'
          startIcon={<AddIcon />}
          onClick={() => addHeader()}
        >
          {t('common.add')}
        </Button>
      </Grid>
    </Grid>
  </Box>;
}
