import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { createStatusPage } from '../../utils/API';
import { useHistory } from 'react-router-dom';

export default function CreateStatusPageDialog({ onClose }) {
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const history = useHistory();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ title, setTitle ] = useState('');

  function doCreateStatusPage() {
    if (!title.match(RegexPatterns.title)) {
      return;
    }
    setIsLoading(true);
    createStatusPage(title)
      .then(result => {
        enqueueSnackbar(t('statuspages.pageCreated'), { variant: 'success' });
        history.push('/statuspages/' + result.statusPageId);
        onCloseHook.current();
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.pageCreateFailed'), { variant: 'error' });
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='sm'>
    <DialogTitle>{t('statuspages.createStatusPage')}</DialogTitle>
    <DialogContent>
      <FormControl fullWidth>
        <ValidatingTextField
          label={t('statuspages.title')}
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
      <Button color='primary' onClick={() => doCreateStatusPage()} disabled={isLoading || title.length<3}>
        {t('statuspages.createStatusPage')}
      </Button>
    </DialogActions>
  </Dialog>;
}