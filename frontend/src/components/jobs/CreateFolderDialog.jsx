import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { createFolder, getFolders } from '../../utils/API';
import { useDispatch } from 'react-redux';
import { setFolders } from '../../redux/actions';

export default function CreateFolderDialog({ onClose }) {
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ title, setTitle ] = useState('');

  function doCreateFolder() {
    if (!title.match(RegexPatterns.title)) {
      return;
    }
    setIsLoading(true);

    createFolder(title)
      .then(result => {
        enqueueSnackbar(t('jobs.folders.created'), { variant: 'success' });
        getFolders().then(response => dispatch(setFolders(response.folders)));
        onCloseHook.current();
      })
      .catch(error => {
        if (error.response && error.response.status === 409) {
          enqueueSnackbar(t('jobs.folders.titleConflict'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('jobs.folders.createFailed'), { variant: 'error' });
        }
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('jobs.folders.create')}</DialogTitle>
    <DialogContent>
      <FormControl fullWidth>
        <ValidatingTextField
          label={t('jobs.folders.title')}
          onChange={({target}) => setTitle(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.title}
          patternErrorText={t('common.checkInput')}
          fullWidth
          autoFocus
          />
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current} disabled={isLoading}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => doCreateFolder()} disabled={isLoading || title.length<3}>
        {t('jobs.folders.create')}
      </Button>
    </DialogActions>
  </Dialog>;
}