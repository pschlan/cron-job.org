import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Select, MenuItem, InputLabel, makeStyles, LinearProgress } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { createStatusPageMonitor } from '../../utils/API';
import { Alert, AlertTitle } from '@material-ui/lab';
import useJobs from '../../hooks/useJobs';

const useStyles = makeStyles(theme => ({
  createStatusPageMonitorDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function CreateStatusPageMonitorDialog({ statusPageId, onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const { jobs, loading: areJobsLoading } = useJobs();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ jobId, setJobId ] = useState('');
  const [ title, setTitle ] = useState('');

  function onJobChange({ target }) {
    const jobId = parseInt(target.value);
    setJobId(jobId);

    const job = jobs.find(x => x.jobId === jobId);
    if (job && job.title && !title) {
      setTitle(job.title);
    }
  }

  function doCreateMonitor() {
    if (!title.match(RegexPatterns.title) || !jobId) {
      return;
    }
    setIsLoading(true);
    createStatusPageMonitor(statusPageId, jobId, title)
      .then(() => {
        enqueueSnackbar(t('statuspages.monitorCreated'), { variant: 'success' });
        onCloseHook.current(true);
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.monitorCreateFailed'), { variant: 'error' });
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={() => onCloseHook.current()} fullWidth maxWidth='sm'>
    <DialogTitle>{t('statuspages.createMonitor')}</DialogTitle>
    <DialogContent className={classes.createStatusPageMonitorDialog}>
      <div>
        {t('statuspages.createMonitorText')}
      </div>

      <FormControl fullWidth>
        {areJobsLoading && <LinearProgress />}
        {!areJobsLoading && <>
          <InputLabel id='job-select-label'>{t('statuspages.job')}</InputLabel>
          <Select
            labelId='job-select-label'
            value={jobId}
            onChange={onJobChange}
            required>
          {jobs.map((job) => <MenuItem value={job.jobId} key={job.jobId}>{job.title || job.url}</MenuItem>)}
          </Select>
        </>}
      </FormControl>

      <FormControl fullWidth>
        <ValidatingTextField
          label={t('statuspages.title')}
          value={title}
          onChange={({target}) => setTitle(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.title}
          patternErrorText={t('common.checkInput')}
          fullWidth
          autoFocus
          />
      </FormControl>

      <Alert severity='info'>
        <AlertTitle>{t('common.note')}</AlertTitle>
        {t('statuspages.monitorModeNote')}
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={() => onCloseHook.current()} disabled={isLoading}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => doCreateMonitor()} disabled={
        isLoading ||
        title.length<3 ||
        !jobId}>
          {t('statuspages.createMonitor')}
      </Button>
    </DialogActions>
  </Dialog>;
}