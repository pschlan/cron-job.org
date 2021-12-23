import React, { useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, InputAdornment, makeStyles, TextField, IconButton } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { getAPIKeyToken } from '../../utils/API';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import ApiKeyIcon from '@material-ui/icons/VpnKey';
import CopyIcon from '@material-ui/icons/FileCopy';
import CopyToClipboard from 'react-copy-to-clipboard';

const useStyles = makeStyles(theme => ({
  showTokenDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function ShowAPIKeyDialog({ apiKey, onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ password, setPassword ] = useState('');
  const [ token, setToken ] = useState(null);
  const tokenInputRef = useRef();

  function showToken() {
    getAPIKeyToken(apiKey.apiKeyId, password)
      .then(response => {
        setToken(response.apiKeyToken);
      })
      .catch(error => {
        if (error.response && error.response.status === 403) {
          enqueueSnackbar(t('settings.wrongPasswordError'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('settings.apiKeys.showKeyError'), { variant: 'error' });
        }
      });
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      if (password.length >= 0) {
        showToken();
      }
    }
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('settings.apiKeys.showKeyDialogTitle', { title: apiKey.title })}</DialogTitle>
    <DialogContent className={classes.showTokenDialog}>
      {token === null && <>
        <DialogContentText>
          {t('settings.apiKeys.showKeyDialogText')}
        </DialogContentText>
        <FormControl fullWidth>
          <TextField
            type='password'
            label={t('settings.apiKeys.accountPassword')}
            onChange={({target}) => setPassword(target.value)}
            value={password}
            inputProps={{ onKeyPress: handleKeyPress }}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
            autoFocus
            />
        </FormControl>
      </>}
      {token !== null && <>
        <DialogContentText>
          {t('settings.apiKeys.showKeyFindBelow')}
        </DialogContentText>
        <TextField
          defaultValue={token}
          inputProps={{
            readOnly: true,
            style: { fontFamily: 'courier' },
            onFocus: event => event.target.select()
          }}
          inputRef={tokenInputRef}
          InputProps={{
            startAdornment: <InputAdornment position='start'>
                <ApiKeyIcon style={{ marginTop: '0.5rem' }} />
              </InputAdornment>,
            endAdornment: <InputAdornment position='end'>
              <CopyToClipboard
                text={token}
                onCopy={
                  (text, result) => {
                    if (tokenInputRef.current) {
                      tokenInputRef.current.select();
                    }
                    enqueueSnackbar(t(result ? 'settings.apiKeys.tokenCopySuccess' : 'settings.apiKeys.tokenCopyError'), { variant: result ? 'success' : 'error' });
                  }
                }
                >
                <IconButton size='small'>
                  <CopyIcon />
                </IconButton>
              </CopyToClipboard>
            </InputAdornment>
          }}
          fullWidth
          />
      </>}
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t(token === null ? 'common.cancel' : 'common.close')}
      </Button>
      {token === null && <Button color='primary' onClick={() => showToken()} disabled={password===''}>
        {t('settings.apiKeys.showKey')}
      </Button>}
    </DialogActions>
  </Dialog>;
}
