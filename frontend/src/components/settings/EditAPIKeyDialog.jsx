import React, { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, makeStyles, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { updateAPIKey } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

const useStyles = makeStyles(theme => ({
  editDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function EditAPIKeyDialog({ apiKey, onClose, onRefreshAPIKeys }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshAPIKeysHook = useRef(onRefreshAPIKeys, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ title, setTitle ] = useState(apiKey.title);
  const [ ipAddresses, setIPAddresses ] = useState(apiKey.limitIPs ? apiKey.limitIPs.join(', ') : '');

  function saveKey() {
    updateAPIKey(apiKey.apiKeyId, title, ipAddresses)
      .then(() => {
        enqueueSnackbar(t('settings.apiKeys.saved'), { variant: 'success' });
        onRefreshAPIKeysHook.current();
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('settings.apiKeys.saveError'), { variant: 'error' });
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.apiKeys.editKey', { title: apiKey.title })}</DialogTitle>
    <DialogContent className={classes.editDialog}>
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
      <Button color='primary' onClick={() => saveKey()} disabled={title===''}>
        {t('common.save')}
      </Button>
    </DialogActions>
  </Dialog>;
}
