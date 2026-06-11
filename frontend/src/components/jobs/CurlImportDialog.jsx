import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, TextField, makeStyles
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';

import { parseCurl } from '../../utils/CurlParser';
import { RequestMethod } from '../../utils/Constants';

const useStyles = makeStyles(() => ({
  code: {
    fontFamily: '"Roboto Mono", courier',
  },
}));

export default function CurlImportDialog({ open, onClose, onImport }) {
  const { t } = useTranslation();
  const classes = useStyles();

  const [ command, setCommand ] = useState('');
  const [ error, setError ] = useState(null);
  const onCloseRef = useRef(onClose);
  const onImportRef = useRef(onImport);
  onCloseRef.current = onClose;
  onImportRef.current = onImport;

  function close() {
    setCommand('');
    setError(null);
    onCloseRef.current();
  }

  function doImport() {
    const parsed = parseCurl(command);
    if (!parsed) {
      setError(t('jobs.curlImport.parseError'));
      return;
    }

    let methodNumeric = null;
    if (parsed.method !== null) {
      if (Object.prototype.hasOwnProperty.call(RequestMethod, parsed.method)) {
        methodNumeric = RequestMethod[parsed.method];
      } else {
        setError(t('jobs.curlImport.unsupportedMethod', { method: parsed.method }));
        return;
      }
    }

    onImportRef.current({
      url: parsed.url,
      method: methodNumeric,
      headers: parsed.headers,
      body: parsed.body,
      auth: parsed.auth,
    });
    setCommand('');
    setError(null);
  }

  return <Dialog open={open} onClose={close} maxWidth='md' fullWidth>
    <DialogTitle>{t('jobs.curlImport.title')}</DialogTitle>
    <DialogContent>
      <DialogContentText>{t('jobs.curlImport.help')}</DialogContentText>
      <TextField
        autoFocus
        label={t('jobs.curlImport.command')}
        value={command}
        onChange={({target}) => { setCommand(target.value); setError(null); }}
        placeholder={"curl -X POST 'https://example.com/api' -H 'Accept: application/json' -d 'name=ada'"}
        multiline
        minRows={8}
        maxRows={16}
        fullWidth
        variant='filled'
        InputProps={{ classes: { input: classes.code } }}
        InputLabelProps={{ shrink: true }}
        />
      {error && <Alert severity='error' style={{ marginTop: 8 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={close}>{t('common.cancel')}</Button>
      <Button onClick={doImport} color='primary' disabled={!command.trim()}>
        {t('jobs.curlImport.import')}
      </Button>
    </DialogActions>
  </Dialog>;
}
