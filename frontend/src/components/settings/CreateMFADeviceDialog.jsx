import React, { useRef, useState } from 'react';
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, List, ListItem, ListItemAvatar, ListItemText, TextField } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import TOTPDeviceIcon from '@material-ui/icons/PhoneIphone';
import YubicoOTPDeviceIcon from '@material-ui/icons/VpnKey';
import { useEffect } from 'react';
import { confirmMFADevice, createMFADevice } from '../../utils/API';
import { useSnackbar } from 'notistack';
import QRCode from 'qrcode.react';
import { Config } from '../../utils/Config';

const STATE_INITIAL = 0;
const STATE_PAIR_TOTP = 1;

export default function CreateMFADeviceDialog({ onClose, onRefreshMFADevices, username }) {
  const onCloseHook = useRef(onClose, []);
  const onRefreshMFADevicesHook = useRef(onRefreshMFADevices, []);
  const totpCodeRef = useRef();
  const titleRef = useRef();

  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ state, setState ] = useState(STATE_INITIAL);
  const [ type, setType ] = useState(null);
  const [ title, setTitle ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ mfaDevice, setMFADevice ] = useState();
  const [ code, setCode ] = useState('');

  useEffect(() => {
    if (type === null) {
      return;
    }

    if (title === '') {
      setTitle(t(`settings.mfa.${type}.title`));
      if (titleRef.current) {
        titleRef.current.focus();
      }
    }
  }, [type, t, title]);

  function createDevice() {
    createMFADevice(title, type, password, code)
      .then(response => {
        setMFADevice({...response.mfaDevice, secret: response.secret});
        if (type === 'totpDevice') {
          setState(STATE_PAIR_TOTP);
          if (totpCodeRef.current) {
            totpCodeRef.current.focus();
          }
        } else if (type === 'yubicoOtpDevice') {
          enqueueSnackbar(t('settings.mfa.created'), { variant: 'success' });
          onRefreshMFADevicesHook.current();
          onCloseHook.current();
        }
      })
      .catch(error => {
        if (error.response && error.response.status === 403) {
          enqueueSnackbar(t(type==='yubicoOtpDevice'?'settings.mfa.confirmError':'settings.wrongPasswordError'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('settings.mfa.createError'), { variant: 'error' });
        }
      });
  }

  function confirmDevice() {
    confirmMFADevice(mfaDevice.mfaDeviceId, code.replace(/[^0-9]/, ''))
      .then(() => {
        enqueueSnackbar(t('settings.mfa.created'), { variant: 'success' });
        onRefreshMFADevicesHook.current();
        onCloseHook.current();
      })
    .catch(() => {
      enqueueSnackbar(t('settings.mfa.confirmError'), { variant: 'error' });
    });
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.mfa.add')}</DialogTitle>
    <DialogContent>
      {state===STATE_INITIAL && <>
        {t('settings.mfa.selectType')}

        <List>
          <ListItem button onClick={() => setType('totpDevice')} selected={type==='totpDevice'}>
            <ListItemAvatar>
              <Avatar alt={t('settings.mfa.totpDevice.title')}>
                <TOTPDeviceIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={t('settings.mfa.totpDevice.title')}
              secondary={t('settings.mfa.totpDevice.description')}
              />
          </ListItem>

          {Config.enableYubicoOTP && <ListItem button onClick={() => setType('yubicoOtpDevice')} selected={type==='yubicoOtpDevice'}>
            <ListItemAvatar>
              <Avatar alt={t('settings.mfa.yubicoOtpDevice.title')}>
                <YubicoOTPDeviceIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={t('settings.mfa.yubicoOtpDevice.title')}
              secondary={t('settings.mfa.yubicoOtpDevice.description')}
              />
          </ListItem>}
        </List>

        {type!==null && <>
          <FormControl fullWidth>
            <TextField
              label={t('settings.mfa.title')}
              value={title}
              onChange={({target}) => setTitle(target.value)}
              inputRef={titleRef}
              required
              fullWidth
              />
          </FormControl>

          <FormControl fullWidth>
            <TextField
              type='password'
              label={t('settings.mfa.accountPassword')}
              onChange={({target}) => setPassword(target.value)}
              required
              fullWidth
              />
          </FormControl>

          {type==='yubicoOtpDevice' && <FormControl fullWidth>
            <TextField
              label={t('settings.mfa.yubicoOtpDevice.enterCode')}
              value={code}
              onChange={({target}) => setCode(target.value)}
              required
              fullWidth
              />
          </FormControl>}
        </>}
      </>}

      {state===STATE_PAIR_TOTP && <>
        {t('settings.mfa.totpDevice.pairInstructions')}
        <Box textAlign='center' m={2}>
          <QRCode value={`otpauth://totp/${encodeURIComponent(Config.productName)}:${encodeURIComponent(username)}?secret=${mfaDevice.secret}&issuer=${encodeURIComponent(Config.productName)}`} />
        </Box>

        <FormControl fullWidth>
          <TextField
            label={t('settings.mfa.totpDevice.enterCode')}
            onChange={({target}) => setCode(target.value)}
            inputRef={totpCodeRef}
            inputProps={{inputMode: 'numeric', pattern: '[0-9]*', autocomplete: 'one-time-code'}}
            required
            fullWidth
            />
        </FormControl>
      </>}
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t('common.cancel')}
      </Button>
      {state===STATE_INITIAL && <Button color='primary' disabled={title==='' || password==='' || type===null || (type==='yubicoOtpDevice' && code ==='')} onClick={() => createDevice()}>
        {t(type==='yubicoOtpDevice' ? 'settings.mfa.confirm' : 'settings.mfa.next')}
      </Button>}
      {state===STATE_PAIR_TOTP && <Button color='primary' disabled={code.length<6} onClick={() => confirmDevice()}>
        {t('settings.mfa.confirm')}
      </Button>}
    </DialogActions>
  </Dialog>;
}