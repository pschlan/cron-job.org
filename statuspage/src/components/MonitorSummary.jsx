import React, { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Icon, LinearProgress, makeStyles } from '@material-ui/core';
import { calculateAverage, calculatePercentile } from '../utils/Stats';
import WarningIcon from '@material-ui/icons/WarningRounded';
import ErrorIcon from '@material-ui/icons/Error';
import HealthyIcon from '@material-ui/icons/CheckCircleOutline';
import DisabledIcon from '@material-ui/icons/RemoveCircleOutline';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { useTranslation } from 'react-i18next';

function determineMonitorHealth(monitor) {
  const healthSamples = monitor.timeSeriesData.last24Hours.slice(-2);
  const healthLatency = calculatePercentile(healthSamples
    .filter(x => x[1] !== -1)
    .map(x => x[1]), monitor.percentile);
  const healthUptime = calculateAverage(healthSamples
    .filter(x => x[3] > 0)
    .map(x => x[2] / x[3]));

  const result = { uptime: 'OK', latency: 'OK' };

  if (healthUptime >= 0) {
    if (monitor.thresholds.uptime.error > 0
      && healthUptime <= monitor.thresholds.uptime.error) {
      result.uptime = 'ERROR';
    } else if (monitor.thresholds.uptime.warning > 0
      && healthUptime <= monitor.thresholds.uptime.warning) {
      result.uptime = 'WARNING';
    }
  }

  if (healthLatency >= 0) {
    if (monitor.thresholds.latency.error > 0
      && healthLatency >= monitor.thresholds.latency.error) {
      result.latency = 'ERROR';
    } else if (monitor.thresholds.latency.warning > 0
      && healthLatency >= monitor.thresholds.latency.warning) {
      result.latency = 'WARNING';
    }
  }

  return { ...result, currentLatency: healthLatency, currentUptime: healthUptime };
}

const useStyles = makeStyles(theme => ({
  grid: {
    marginBottom: theme.spacing(1)
  },
  health: {
    display: 'flex',
    alignItems: 'flex-end',
    flexDirection: 'column'
  },
  healthIndicator: {
    '& .MuiIcon-root': {
      marginTop: theme.spacing(0.5),
      marginRight: theme.spacing(0.5)
    }
  },
  warning: {
    color: 'darkorange',
    display: 'flex'
  },
  error: {
    color: 'red',
    display: 'flex'
  },
  ok: {
    color: 'darkgreen',
    display: 'flex'
  },
  disabled: {
    color: 'grey',
    display: 'flex'
  },
  accordionSummary: {
    fontSize: '1.25rem'
  }
}));

function HealthIndicator({ health, okText, warningText, errorText }) {
  const classes = useStyles();
  const { t } = useTranslation();

  return <div className={classes.healthIndicator}>
    {health === 'OK' && <span className={classes.ok}>
      <Icon component={HealthyIcon} fontSize='small' />
      <span>{okText}</span>
    </span>}
    {health === 'WARNING' && <span className={classes.warning}>
      <Icon component={WarningIcon} fontSize='small' />
      {warningText}
    </span>}
    {health === 'ERROR' && <span className={classes.error}>
      <Icon component={ErrorIcon} fontSize='small' />
      {errorText}
    </span>}
    {health === 'DISABLED' && <span className={classes.disabled}>
      <Icon component={DisabledIcon} fontSize='small' />
      {t('status.disabled')}
    </span>}
  </div>;
}

export default function MonitorSummary({ monitor, timespan }) {
  const classes = useStyles();
  const { t } = useTranslation();

  const [health, setHealth] = useState();

  useEffect(() => {
    setHealth(determineMonitorHealth(monitor));
  }, [monitor, timespan]);

  return !health ? <LinearProgress /> : <Accordion>
    <AccordionSummary className={classes.accordionSummary} expandIcon={monitor.enabled && <ExpandMoreIcon />}>
      <Box display='flex' flexGrow={1}>
        <Box flexGrow={1}>
          {monitor.title}
        </Box>
        <Box className={classes.health}>
          {monitor.enabled ? <>
            {health.uptime === 'OK' && health.latency === 'OK' ?
              <>
                <HealthIndicator health='OK' okText={t('status.healthy')} />
              </> :
              <>
                {health.latency !== 'OK' && <HealthIndicator health={health.latency}
                  warningText={t('status.latencyWarning')}
                  errorText={t('status.latencyError')}
                  />}
                {health.uptime !== 'OK' && <HealthIndicator health={health.uptime}
                  warningText={t('status.availabilityWarning')}
                  errorText={t('status.availabilityError')}
                  />}
              </>}
            </> : <>
              <HealthIndicator health='DISABLED' />
            </>}
        </Box>
      </Box>
    </AccordionSummary>
    {monitor.enabled && <AccordionDetails>
      {health.uptime === 'OK' && health.latency === 'OK' && <>
        {t('status.allSystemsRunAsExpected')}
      </>}
      {health.latency !== 'OK' && <>
        {t('status.highLatencyText', { ms: health.currentLatency.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })}
      </>}
      {health.uptime !== 'OK' && <>
        {t('status.lowAvailabilityText', { percent: (health.currentUptime * 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) })}
      </>}
    </AccordionDetails>}
  </Accordion>;
}
