import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Grid, makeStyles, Typography } from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import { getPublicStatusPage } from '../utils/API';
import Monitor from './Monitor';
import MonitorSummary from './MonitorSummary';
import TimespanSelector from './TimespanSelector';
import ErrorPage from './ErrorPage';
import Footer from './Footer';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import useLanguageCode from '../hooks/useLanguageCode';
import { Config } from '../utils/Config';

const useStyles = makeStyles(theme => ({
  loading: {
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block',
    marginTop: theme.spacing(10),
    marginBottom: theme.spacing(10)
  },
  statusPage: {
    marginTop: theme.spacing(4)
  },
  logo: {
    maxHeight: '48px'
  },
  header: {
    marginBottom: theme.spacing(4)
  },
  metrics: {
    marginTop: theme.spacing(4)
  }
}));

export default function StatusPage() {
  const classes = useStyles();
  const { t } = useTranslation();
  const languageCode = useLanguageCode();

  const domainName = window.location.hostname === 'localhost' ? Config.devDomain : window.location.hostname;

  const [statusPage, setStatusPage] = useState();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState();
  const [timespan, setTimespan] = useState();

  const refreshHook = useCallback(() => {
    setIsRefreshing(true);
    getPublicStatusPage(domainName.toLowerCase())
      .then(({ statusPage }) => {
        setStatusPage(statusPage);
      })
      .catch(error => {
        setError(error);
      })
      .finally(() => setIsRefreshing(false));
  }, [domainName]);

  useEffect(() => {
    refreshHook();
  }, [refreshHook]);

  // This is just a sneaky way to enforce re-render when the language changes.
  useEffect(() => {
    setStatusPage(p => p && ({...p}));
  }, [languageCode]);

  useEffect(() => {
    if (statusPage) {
      document.title = statusPage.statusPageMeta.title;
    }
  }, [statusPage]);

  return !statusPage ? <>
      {error ?
        <ErrorPage error={error} /> :
        <CircularProgress className={classes.loading} />}
    </> : <div className={classes.statusPage}>

      <Box display='flex' alignItems='center' className={classes.header}>
        <Box flexGrow={1}>
          {statusPage.statusPageMeta.logo && statusPage.statusPageMeta.logo.data && statusPage.statusPageMeta.logo.mimeType ? <img
            src={`data:${statusPage.statusPageMeta.logo.mimeType};base64,${statusPage.statusPageMeta.logo.data}`}
            className={classes.logo}
            title={statusPage.statusPageMeta.title}
            alt={statusPage.statusPageMeta.title}
            /> : <Typography variant='h4'>{statusPage.statusPageMeta.title}</Typography>}
        </Box>
        <Box>
          <LanguageSelector />
        </Box>
      </Box>

      <div>
        {(statusPage.statusPageMonitors || []).map((monitor, index) =>
          <MonitorSummary key={index} monitor={monitor} timespan={timespan} />)}
      </div>

      <Grid container className={classes.metrics}>
        <Grid item xs={8}>
          <TimespanSelector onChange={x => setTimespan(x)} />
        </Grid>
        <Grid item xs={4}>
          <Box display='flex' justifyContent='flex-end' alignItems='flex-end' pt={0.75}>
            <Button
              variant='text'
              startIcon={<RefreshIcon />}
              disabled={isRefreshing}
              onClick={refreshHook}>
                {t('common.refresh')}
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12}>
          {(statusPage.statusPageMonitors || []).map((monitor, index) =>
            <Monitor key={index} monitor={{...monitor, index}} timespan={timespan} />)}
        </Grid>
      </Grid>

      <Footer />
    </div>;
}