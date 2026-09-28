import React, { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import { deleteNotificationChannel } from '../../utils/API';
import { useSnackbar } from 'notistack';

const useStyles = makeStyles(theme => ({
  deleteDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function DeleteNotificationChannelDialog({ channel, onClose, onRefreshChannels }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const onRefreshChannelsHook = useRef(onRefreshChannels, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  function confirmDelete() {
    deleteNotificationChannel(channel.channelId)
      .then(() => {
        enqueueSnackbar(t('settings.notificationChannels.deleted'), { variant: 'success' });
        onRefreshChannelsHook.current();
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('settings.notificationChannels.deleteError'), { variant: 'error' });
      });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.notificationChannels.deleteChannel')}</DialogTitle>
    <DialogContent className={classes.deleteDialog}>
      <Alert severity='warning'>
        <AlertTitle>{t('common.note')}</AlertTitle>
        {t('settings.notificationChannels.confirmDelete')}
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
