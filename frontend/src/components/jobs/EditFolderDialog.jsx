import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { updateFolder, getFolders } from '../../utils/API';
import { useDispatch } from 'react-redux';
import { setFolders } from '../../redux/actions';

export default function EditFolderDialog({ folder, onClose }) {
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ title, setTitle ] = useState(folder.title);

  function doUpdateFolder() {
    if (!title.match(RegexPatterns.title)) {
      return;
    }
    setIsLoading(true);

    updateFolder(folder.folderId, title)
      .then(result => {
        enqueueSnackbar(t('jobs.folders.saved'), { variant: 'success' });
        getFolders().then(response => dispatch(setFolders(response.folders)));
        onCloseHook.current();
      })
      .catch(error => {
        if (error.response && error.response.status === 409) {
          enqueueSnackbar(t('jobs.folders.titleConflict'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('jobs.folders.saveFailed'), { variant: 'error' });
        }
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('jobs.folders.edit', { title: folder.title })}</DialogTitle>
    <DialogContent>
      <FormControl fullWidth>
        <ValidatingTextField
          label={t('jobs.folders.title')}
          onChange={({target}) => setTitle(target.value)}
          value={title}
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
      <Button color='primary' onClick={() => doUpdateFolder()} disabled={isLoading || title.length<3}>
        {t('common.save')}
      </Button>
    </DialogActions>
  </Dialog>;
}