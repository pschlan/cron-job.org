import React, { useState, useRef, useEffect } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, LinearProgress, makeStyles } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { JobStatus, jobStatusText } from '../../utils/Constants';
import { getJobHistoryDetails } from '../../utils/API';
import Timing from './Timing';
import Code from '../misc/Code';
import Headers from '../misc/Headers';
import SslCertExpiryIcon from '../misc/SslCertExpiryIcon';

const useStyles = makeStyles(() => ({
  statusRow: {
    display: 'flex',
    alignItems: 'center'
  }
}));

export default function HistoryDetails({ log, open, onClose, moment }) {
  const { t } = useTranslation();
  const classes = useStyles();
  const [ isLoading, setIsLoading ] = useState(true);
  const onCloseHook = useRef(onClose, []);
  const [ details, setDetails ] = useState({});

  useEffect(() => {
    getJobHistoryDetails(log.identifier)
      .then(result => setDetails(result.jobHistoryDetails))
      .catch(error => console.log(error))
      .finally(() => setIsLoading(false));
  }, [log]);

  return <>
    <Dialog open={open} onClose={onCloseHook.current} fullWidth maxWidth='md'>
      <DialogTitle>{t('jobs.detailsDialogTitle', { date: moment(log.date * 1000).calendar() })}</DialogTitle>
      <DialogContent>
        <Typography variant='overline'>{t('jobs.fetchedUrl')}</Typography>
        <Typography component='div' gutterBottom>
          {log.url}
        </Typography>

        <Typography variant='overline'>{t('jobs.status')}</Typography>
        <Typography component='div' gutterBottom>
          <div className={classes.statusRow}>
            {[JobStatus.OK, JobStatus.FAILED_HTTPERROR].includes(log.status) ?
              <>{log.httpStatus} {log.statusText}</> :
              <>{t('jobs.statuses.' + jobStatusText(log.status))}</>}
            <SslCertExpiryIcon sslCertExpiry={details.sslCertExpiry || log.sslCertExpiry} />
          </div>
        </Typography>

        <Timing stats={details && details.stats} header={<Typography variant='overline'>{t('jobs.timing')}</Typography>} />

        {isLoading ?
          <LinearProgress /> :
          <>
            {details.headers && <>
              <Typography variant='overline'>{t('jobs.responseHeaders')}</Typography>
              <Code><Headers data={details.headers} /></Code>
            </>}

            {details.body && <>
              <Typography variant='overline'>{t('jobs.responseBody')}</Typography>
              <Code>{details.body}</Code>
            </>}
          </>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseHook.current} color="primary">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
