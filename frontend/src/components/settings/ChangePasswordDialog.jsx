import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, makeStyles, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import { changeUserPassword } from '../../utils/API';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';

const useStyles = makeStyles(theme => ({
  changePasswordDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function ChangePasswordDialog({ onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ currentPassword, setCurrentPassword ] = useState('');
  const [ newPassword, setNewPassword ] = useState('');
  const [ repeatPassword, setRepeatPassword ] = useState('');

  function changePassword() {
    if (newPassword !== repeatPassword || !newPassword.length || !currentPassword.length) {
      return;
    }
    changeUserPassword(currentPassword, newPassword)
      .then(() => {
        enqueueSnackbar(t('settings.passwordChanged'), { variant: 'success' });
        onCloseHook.current();
      })
      .catch(error => {
        if (error.response && error.response.status === 403) {
          enqueueSnackbar(t('settings.wrongPasswordError'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('settings.failedToChangePassword'), { variant: 'error' });
        }
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.changePassword')}</DialogTitle>
    <DialogContent className={classes.changePasswordDialog}>
      <FormControl fullWidth>
        <TextField
          type='password'
          label={t('settings.currentPassword')}
          onChange={({target}) => setCurrentPassword(target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          autoFocus
          />
      </FormControl>
      <FormControl fullWidth>
        <ValidatingTextField
          type='password'
          label={t('settings.newPassword')}
          onChange={({target}) => setNewPassword(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.password}
          patternErrorText={t('settings.invalidPassword')}
          fullWidth
          />
      </FormControl>
      <FormControl fullWidth>
        <ValidatingTextField
          type='password'
          label={t('settings.repeatNewPassword')}
          onChange={({target}) => setRepeatPassword(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.password}
          patternErrorText={t('settings.invalidPassword')}
          fullWidth
          />
      </FormControl>
      {(newPassword.length > 0 && repeatPassword.length > 0 && newPassword !== repeatPassword) &&
        <Alert severity='error'>
          <AlertTitle>{t('common.error')}</AlertTitle>
          {t('settings.passwordsDontMatch')}
        </Alert>}
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => changePassword()} disabled={!currentPassword.length || !newPassword.length || newPassword !== repeatPassword}>
        {t('settings.changePassword')}
      </Button>
    </DialogActions>
  </Dialog>;
}