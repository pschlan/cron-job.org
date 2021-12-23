import React, { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, makeStyles, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import { deleteMFADevice } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

const useStyles = makeStyles(theme => ({
  deleteDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function DeleteMFADeviceDialog({ mfaDevice, onClose, onRefreshMFADevices }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshMFADevicesHook = useRef(onRefreshMFADevices, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ password, setPassword ] = useState('');

  function confirmDelete() {
    deleteMFADevice(mfaDevice.mfaDeviceId, password)
      .then(() => {
        enqueueSnackbar(t('settings.mfa.deleted'), { variant: 'success' });
        onRefreshMFADevicesHook.current();
        onCloseHook.current();
      })
      .catch(error => {
        if (error.response && error.response.status === 403) {
          enqueueSnackbar(t('settings.wrongPasswordError'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('settings.mfa.deleteError'), { variant: 'error' });
        }
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.mfa.deleteDevice', { title: mfaDevice.title })}</DialogTitle>
    <DialogContent className={classes.deleteDialog}>
      <Alert severity='warning'>
        <AlertTitle>{t('common.note')}</AlertTitle>
        {t('settings.mfa.confirmDelete')}
      </Alert>
      <FormControl fullWidth>
        <TextField
          type='password'
          label={t('settings.mfa.accountPassword')}
          onChange={({target}) => setPassword(target.value)}
          value={password}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
          autoFocus
          />
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => confirmDelete()} disabled={password===''}>
        {t('common.delete')}
      </Button>
    </DialogActions>
  </Dialog>;
}
