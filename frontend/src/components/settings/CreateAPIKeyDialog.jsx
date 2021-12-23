import React, { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, makeStyles, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { createAPIKey } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

const useStyles = makeStyles(theme => ({
  createDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function CreateAPIKeyDialog({ onClose, onRefreshAPIKeys }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshAPIKeysHook = useRef(onRefreshAPIKeys, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ title, setTitle ] = useState(t('settings.apiKeys.defaultTitle'));
  const [ ipAddresses, setIPAddresses ] = useState('');

  function createKey() {
    createAPIKey(title, ipAddresses)
      .then(() => {
        enqueueSnackbar(t('settings.apiKeys.created'), { variant: 'success' });
        onRefreshAPIKeysHook.current();
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('settings.apiKeys.createError'), { variant: 'error' });
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.apiKeys.add')}</DialogTitle>
    <DialogContent className={classes.createDialog}>
      <DialogContentText>
        {t('settings.apiKeys.addText')}
      </DialogContentText>
      <FormControl fullWidth>
        <TextField
          label={t('settings.apiKeys.title')}
          onChange={({target}) => setTitle(target.value)}
          value={title}
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          autoFocus
          />
      </FormControl>
      <FormControl fullWidth>
        <TextField
          label={t('settings.apiKeys.ipLimit')}
          onChange={({target}) => setIPAddresses(target.value)}
          value={ipAddresses}
          InputLabelProps={{ shrink: true }}
          helperText={t('settings.apiKeys.ipLimitHelp')}
          fullWidth
          autoFocus
          />
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => createKey()} disabled={title===''}>
        {t('settings.apiKeys.add')}
      </Button>
    </DialogActions>
  </Dialog>;
}
