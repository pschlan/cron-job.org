import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress, Typography, Tabs, Tab, Grid } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@material-ui/lab';
import ReCAPTCHA from 'react-google-recaptcha';
import { Config } from '../../utils/Config';
import { useSnackbar } from 'notistack';
import { deleteJobTestRun, getJobTestRunStatus, submitJobTestRun } from '../../utils/API';
import { JobStatus, jobStatusText, JobTestRunState } from '../../utils/Constants';
import SuccessIcon from '@material-ui/icons/Check';
import FailureIcon from '@material-ui/icons/ErrorOutline';
import PeerIcon from '@material-ui/icons/Dns';
import { makeStyles } from '@material-ui/styles';
import { green, red } from '@material-ui/core/colors';
import Timing from './Timing';
import Code from '../misc/Code';
import Headers from '../misc/Headers';
import { formatMs } from '../../utils/Units';

const REFRESH_STATUS_INTERVAL_MS = 500;

const useStyles = makeStyles(theme => ({
  hAlign: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  green: {
    color: green[800],
    marginRight: theme.spacing(0.5)
  },
  red: {
    color: red[800],
    marginRight: theme.spacing(0.5)
  },
  tabPanel: {
    padding: theme.spacing(0)
  }
}));

export default function JobTestRun({ job, jobId, onClose }) {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose, []);
  const recaptchaRef = useRef();
  const { enqueueSnackbar } = useSnackbar();
  const [ isLoading, setIsLoading ] = useState(false);
  const [ handle, setHandle ] = useState();
  const [ status, setStatus ] = useState();
  const [ tabValue, setTabValue ] = useState('response');
  const classes = useStyles();

  const refreshStatus = useCallback(() => {
    if (!handle) {
      return;
    }

    getJobTestRunStatus(handle)
      .then(result => {
        if (!result.status) {
          throw new Error('Invalid status!');
        }

        setStatus(result.status);

        if (result.status.state < JobTestRunState.DONE) {
          window.setTimeout(refreshStatus, REFRESH_STATUS_INTERVAL_MS);
        } else {
          return deleteJobTestRun(handle)
            .catch(() => null);
        }
      })
      .catch(() => {
        enqueueSnackbar(t('jobs.testRun.pollError'), { variant: 'error' });
        onCloseRef.current();
      });
  }, [handle, onCloseRef, enqueueSnackbar, t]);

  useEffect(() => {
    if (!handle) {
      return;
    }

    setStatus({ state: JobTestRunState.PREPARING });
    refreshStatus();
  }, [handle, refreshStatus]);

  function executeTestRun() {
    setIsLoading(true);
    recaptchaRef.current.executeAsync()
      .then(token => {
        return submitJobTestRun(token, jobId, job)
          .then(result => setHandle(result.handle))
          .catch(() => {
            enqueueSnackbar(t('jobs.testRun.storeError'), { variant: 'error' });
            if (recaptchaRef.current) {
              recaptchaRef.current.reset();
            }
          });
      })
      .catch(() => {
        enqueueSnackbar(t('jobs.testRun.recaptchaError'), { variant: 'error' });
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
      })
      .finally(() => setIsLoading(false));
  }

  const additionalProps = status && { 'fullWidth': true, 'maxWidth': 'md' };

  return <Dialog open={true} onClose={() => onCloseRef.current()} {...additionalProps}>
    <DialogTitle>
      {t('jobs.testRun.performTestRun', { jobTitle: job.title || job.url })}
    </DialogTitle>
    {!status && <>
      <DialogContent>
        <DialogContentText>
          {t('jobs.testRun.startQuestion')}
        </DialogContentText>
        <Alert severity='info'>
          <AlertTitle>{t('common.note')}</AlertTitle>
          {t('jobs.testRun.ipNote')}
        </Alert>
      </DialogContent>
      <DialogActions>
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={Config.recaptchaSiteKey}
          size='invisible'
          />
        <Button onClick={() => onCloseRef.current()}>
          {t('common.cancel')}
        </Button>
        <Button autoFocus color='primary' onClick={executeTestRun} disabled={isLoading}>
          {t('jobs.testRun.start')}
        </Button>
      </DialogActions>
    </>}
    {status && <>
      <DialogContent>
        <Typography variant='overline'>{t('jobs.testRun.status')}</Typography>
        <Typography component='div' gutterBottom>
          {status.state < JobTestRunState.DONE && <>
            <CircularProgress size='0.75rem' /> {t(`jobs.testRun.states.${status.state}`)}
          </>}
          {status.state === JobTestRunState.DONE && <div className={classes.hAlign}>
            {status.result === JobStatus.OK ?
              <SuccessIcon className={classes.green} fontSize='small' /> :
              <FailureIcon className={classes.red} fontSize='small' />}
            {[JobStatus.OK, JobStatus.FAILED_HTTPERROR].includes(status.result) ?
              <>{status.httpStatus} {status.statusText}</> :
              <>{t('jobs.statuses.' + jobStatusText(status.result))}</>}
          </div>}
        </Typography>

        {status.state === JobTestRunState.DONE && <>
          <Grid container>
            <Grid item xs={6}>
              <Typography variant='overline'>{t('jobs.duration')}</Typography>
              <Typography component='div' gutterBottom>
                {formatMs(status.duration, t)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant='overline'>{t('jobs.testRun.peer')}</Typography>
              <Typography component='div' gutterBottom className={classes.hAlign}>
                <PeerIcon fontSize='small' /> {status.peerAddress}:{status.peerPort}
              </Typography>
            </Grid>
          </Grid>

          <Timing stats={status.stats || {}} header={<Typography variant='overline'>{t('jobs.timing')}</Typography>} />

          {(status.headersIn || status.headersOut) && <>
            <Typography variant='overline'>{t('common.details')}</Typography>
            <>
              <Tabs
                value={tabValue}
                onChange={(e, val) => setTabValue(val)}
                indicatorColor="primary"
                textColor="primary"
                fullWidth
                centered>
                <Tab label={t('jobs.testRun.response')} value='response' />
                <Tab label={t('jobs.testRun.rawResponse')} value='rawResponse' />
                <Tab label={t('jobs.testRun.rawRequest')} value='rawRequest' />
              </Tabs>
              <div hidden={tabValue!=='response'} className={classes.tabPanel}>
                <Code height='15rem'>
                  <Headers data={status.headers} />
                  {status.body}
                </Code>
              </div>
              <div hidden={tabValue!=='rawResponse'} className={classes.tabPanel}>
                <Code height='15rem'>
                  <Headers data={status.headersIn} />
                  {status.dataIn}
                </Code>
              </div>
              <div hidden={tabValue!=='rawRequest'} className={classes.tabPanel}>
                <Code height='15rem'>
                  <Headers data={status.headersOut} />
                  {status.dataOut}
                </Code>
              </div>
            </>
          </>}
        </>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onCloseRef.current()}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </>}
  </Dialog>;
}
