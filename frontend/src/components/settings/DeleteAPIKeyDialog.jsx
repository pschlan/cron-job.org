import React, { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import { deleteAPIKey } from '../../utils/API';
import { useSnackbar } from 'notistack';

const useStyles = makeStyles(theme => ({
  deleteDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function DeleteAPIKeyDialog({ apiKey, onClose, onRefreshAPIKeys }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshAPIKeysHook = useRef(onRefreshAPIKeys, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  function confirmDelete() {
    deleteAPIKey(apiKey.apiKeyId)
      .then(() => {
        enqueueSnackbar(t('settings.apiKeys.deleted'), { variant: 'success' });
        onRefreshAPIKeysHook.current();
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('settings.apiKeys.deleteError'), { variant: 'error' });
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.apiKeys.deleteKey', { title: apiKey.title })}</DialogTitle>
    <DialogContent className={classes.deleteDialog}>
      <Alert severity='warning'>
        <AlertTitle>{t('common.note')}</AlertTitle>
        {t('settings.apiKeys.confirmDelete')}
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => confirmDelete()}>
        {t('common.delete')}
      </Button>
    </DialogActions>
  </Dialog>;
}
