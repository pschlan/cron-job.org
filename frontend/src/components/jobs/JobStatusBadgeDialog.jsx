import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, makeStyles, FormControlLabel, Checkbox, LinearProgress } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { getJobStatusBadgeURL } from '../../utils/API';
import CopyableTextField from '../misc/CopyableTextField';
import { Alert, AlertTitle } from '@material-ui/lab';

const useStyles = makeStyles(() => ({
  code: {
    fontFamily: '"Roboto Mono", courier',
    whiteSpace: 'pre-wrap'
  }
}));

const OPTIONS = { 'withTitle': true, 'withLastExecutionDate': false, 'withLatency': false };

export default function JobStatusBadgeDialog({ jobId, job, onClose }) {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose, []);

  const classes = useStyles();

  const [ options, setOptions ] = useState(Object.keys(OPTIONS).reduce((prev, cur) => ({...prev, [cur]: OPTIONS[cur]}), {}));
  const [ isLoading, setIsLoading ] = useState(true);
  const [ url, setUrl ] = useState();

  useEffect(() => {
    getJobStatusBadgeURL(jobId, options)
      .then(response => setUrl(response.url))
      .finally(() => setIsLoading(false));
  }, [options, jobId]);

  return <Dialog open={true} onClose={() => onCloseRef.current()} maxWidth='md' fullWidth>
    <DialogTitle>
      {t('jobs.statusBadgeFor', { jobTitle: job.title || job.url })}
    </DialogTitle>
    <DialogContent>
      <Box>
        {isLoading && <LinearProgress />}
        {url && <img src={url} alt={t('jobs.statusBadge')} />}
      </Box>

      <Box mt={2}>
        {Object.keys(OPTIONS).map(name => <FormControlLabel
          key={name}
          control={<Checkbox checked={options[name]} />}
          onChange={({target}) => setOptions(old => ({...old, [name]: target.checked}))}
          label={t(`jobs.statusBadgeOptions.${name}`)}
          />)}
      </Box>

      {url && <>
        <Box mt={2}>
          <CopyableTextField
            value={url}
            label={t('jobs.statusBadgeURL')}
            fullWidth
            successMsg={t('common.clipboardCopySuccess')}
            errorMsg={t('common.clipboardCopyFailed')}
            variant='filled'
            InputProps={{
              classes: {
                input: classes.code
              }
            }}
          />
        </Box>
        <Box mt={2}>
          <CopyableTextField
            value={`![Cron job status](${url})`}
            label={t('jobs.statusBadgeMarkdown')}
            fullWidth
            successMsg={t('common.clipboardCopySuccess')}
            errorMsg={t('common.clipboardCopyFailed')}
            variant='filled'
            InputProps={{
              classes: {
                input: classes.code
              }
            }}
          />
        </Box>
        <Box mt={2}>
          <Alert severity='info'>
            <AlertTitle>{t('common.note')}</AlertTitle>
            {t('jobs.statusBadgeURLNote')}
          </Alert>
        </Box>
      </>}
    </DialogContent>
    <DialogActions>
      <Button onClick={() => onCloseRef.current()}>
        {t('common.close')}
      </Button>
    </DialogActions>
  </Dialog>;
}
