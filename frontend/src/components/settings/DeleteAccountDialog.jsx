import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, makeStyles, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import { deleteAccount } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { useDispatch } from 'react-redux';
import { logOut } from '../../utils/Utils';
import useUserProfile from '../../hooks/useUserProfile';
import { SubscriptionStatus } from '../../utils/Constants';

const useStyles = makeStyles(theme => ({
    deleteAccountDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function DeleteAccountDialog({ currentEmailAddress, onClose }) {
  const dispatch = useDispatch();

  const userProfile = useUserProfile();

  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ emailAddress, setEmailAddress ] = useState('');

  function confirmDeleteAccount() {
      if (currentEmailAddress !== emailAddress) {
          return;
      }
      deleteAccount(emailAddress)
        .then(() => {
          enqueueSnackbar(t('settings.accountDeleted'), { variant: 'success' });
          logOut(dispatch);
        })
        .catch(() => {
          enqueueSnackbar(t('settings.failedToDeleteAccount'), { variant: 'error' });
        });
  }

  const activeSubscription = userProfile
    && userProfile.userSubscription
    && (userProfile.userSubscription.status === SubscriptionStatus.ACTIVE || userProfile.userSubscription.status === SubscriptionStatus.PENDING);

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.deleteAccount')}</DialogTitle>
    <DialogContent className={classes.deleteAccountDialog}>
      {activeSubscription && <>
          <Alert severity='error'>
          <AlertTitle>{t('common.error')}</AlertTitle>
          {t('settings.deleteAccountActiveSubscription')}
        </Alert>
      </>}
      {!activeSubscription && <>
        <Alert severity='warning'>
          <AlertTitle>{t('common.note')}</AlertTitle>
          {t('settings.deleteAccountNote')}
        </Alert>
        <FormControl fullWidth>
          <TextField
            label={t('settings.deleteAccountTypeEmailAddress')}
            onChange={({target}) => setEmailAddress(target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            autoFocus
            />
        </FormControl>
      </>}
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => confirmDeleteAccount()} disabled={emailAddress!==currentEmailAddress}>
        {t('settings.deleteAccount')}
      </Button>
    </DialogActions>
  </Dialog>;
}