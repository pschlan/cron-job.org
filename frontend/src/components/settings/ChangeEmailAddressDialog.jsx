import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, makeStyles, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import { changeUserEmail } from '../../utils/API';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';

const useStyles = makeStyles(theme => ({
  changeEmailAddressDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function ChangeEmailAddressDialog({ currentEmailAddress, onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ newEmailAddress, setNewEmailAddress ] = useState('');

  function changePassword() {
    if (!newEmailAddress.match(RegexPatterns.email)) {
      return;
    }
    changeUserEmail(newEmailAddress)
      .then(() => {
        enqueueSnackbar(t('settings.emailChanged'), { variant: 'success' });
        onCloseHook.current();
      })
      .catch(error => {
        if (error.response && error.response.status === 409) {
          enqueueSnackbar(t('settings.emailAddressInUse'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('settings.failedToChangeEmail'), { variant: 'error' });
        }
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.changeEmail')}</DialogTitle>
    <DialogContent className={classes.changeEmailAddressDialog}>
      <FormControl fullWidth>
        <TextField
          label={t('settings.currentEmailAddress')}
          InputLabelProps={{ shrink: true }}
          disabled={true}
          defaultValue={currentEmailAddress}
          fullWidth
          />
      </FormControl>
      <FormControl fullWidth>
        <ValidatingTextField
          label={t('settings.newEmailAddress')}
          onChange={({target}) => setNewEmailAddress(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.email}
          patternErrorText={t('common.checkInput')}
          fullWidth
          autoFocus
          />
      </FormControl>
      <Alert severity='info'>
        <AlertTitle>{t('common.note')}</AlertTitle>
        {t('settings.changeEmailAddressNote')}
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => changePassword()} disabled={!newEmailAddress.match(RegexPatterns.email) || newEmailAddress===currentEmailAddress}>
        {t('settings.changeEmail')}
      </Button>
    </DialogActions>
  </Dialog>;
}