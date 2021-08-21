import React, { useEffect, useState } from 'react';
import { Box, Grid, LinearProgress, makeStyles, Paper, Typography } from '@material-ui/core';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import moment from 'moment';
import { calculateAverage, calculatePercentile } from '../utils/Stats';
import Title from './Title';
import { useTranslation } from 'react-i18next';

function dateTickFormatter(value, timespan) {
  if (timespan === '1day') {
    return moment(value * 1000).format('LT');
  } else {
    return moment(value * 1000).format('L');
  }
}

function dateFormatter(value, timespan) {
  if (timespan === '1day') {
    return moment(value * 1000).format('LLL');
  } else {
    return moment(value * 1000).format('L');
  }
}

function uptimeTickFormatter(value) {
  return (value * 100) + ' %';
}

function latencyTickFormatter(value) {
  if (value > 1000) {
    return (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' s';
  }
  return value + ' ms';
}

function tooltipFormatter(value, name, { dataKey }) {
  switch (dataKey) {
    case 'uptime':
      return [ (value * 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' %', name ];
    case 'latency':
      return [ value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ms', name ];
    default:
    return [ value, name ];
  }
}

function dayStart(x) {
  return x - x % 86400;
}

function startDateFromTimespan(timespan) {
  switch (timespan) {
  case '1day':
    return moment().subtract(1, 'day').unix();
  case '1week':
    return moment().subtract(1, 'weeks').unix();
  case '1month':
    return moment().subtract(1, 'months').unix();
  case '6months':
    return moment().subtract(6, 'months').unix();
  case '1year':
    return moment().subtract(1, 'year').unix();
  default:
    return 0;
  }
}

function endDateFromTimespan(timespan) {
  const now = moment().unix();
  switch (timespan) {
  case '1day':
    return now;
  default:
    return dayStart(now);
  }
}

function intervalFromTimespan(timespan) {
  switch (timespan) {
  case '1day':
    return 15 * 60;
  default:
    return 60 * 60 * 24;
  }
}

function Chart({ data, timespan, dataKey, title, tickFormatter, syncId }) {
  return <>
    <ResponsiveContainer width='100%' height={120}>
      <AreaChart data={data} syncId={syncId}>
        <defs>
          <linearGradient id='gradient' x1={0} y1={0} x2={0} y2={1}>
            <stop offset='5%' stopColor='#c33d1b' stopOpacity={0.8}/>
            <stop offset='95%' stopColor='#c33d1b' stopOpacity={0.2}/>
          </linearGradient>
        </defs>

        <XAxis dataKey='date' type='category' tickFormatter={x => dateTickFormatter(x, timespan)} minTickGap={100} />
        <YAxis type='number' tickFormatter={tickFormatter} />

        <Tooltip labelFormatter={x => dateFormatter(x, timespan)} formatter={tooltipFormatter} />

        <Area type='monotone' dot={{r:1,strokeWidth:1}} dataKey={dataKey} isAnimationActive={false} name={title} fill='url(#gradient)' stroke='#c33d1b' strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </>;
}

const useStyles = makeStyles(theme => ({
  paper: {
    marginBottom: theme.spacing(2)
  },
  grid: {
    marginBottom: theme.spacing(1)
  }
}));

export default function Monitor({ monitor, timespan }) {
  const classes = useStyles();
  const { t } = useTranslation();

  const [data, setData] = useState();
  const [overallLatency, setOverallLatency] = useState(-1);
  const [overallUptime, setOverallUptime] = useState(-1);

  useEffect(() => {
    const startDate = startDateFromTimespan(timespan);
    const endDate = endDateFromTimespan(timespan);
    const interval = intervalFromTimespan(timespan);

    const dates = [];
    for (let d = startDate - startDate % interval; d <= endDate; d += interval) {
      if (d >= startDate) {
        dates.push(d);
      }
    }

    const tsData = (timespan === '1day' ? monitor.timeSeriesData.last24Hours : monitor.timeSeriesData.last12Months)
      .reduce((prev, x) => ({
        ...prev,
        [x[0]]: {
          date: x[0],
          latency: x[1] !== -1 ? x[1] : undefined,
          uptime: x[3] > 0 ? x[2] / x[3] : undefined
        }
      }), {});

    const newData = dates.map(x => (tsData[x] || { date: x }));
    setData(newData);
    setOverallUptime(calculateAverage(newData.map(x => x.uptime).filter(x => x !== undefined)));
    setOverallLatency(calculatePercentile(newData.map(x => x.latency).filter(x => x !== undefined), monitor.percentile));
  }, [monitor, timespan]);

  return !data ? <LinearProgress /> : <Paper className={classes.paper}>
    <Title>
     {monitor.title}
    </Title>

    <Box paddingX={2} paddingY={1}>
      <Box mt={2}>
        <Grid container className={classes.grid}>
          <Grid item xs={6}>
            <Typography variant='h6'>{t('status.availability')}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant='h6' align='right'>
              {overallUptime >= 0 && tooltipFormatter(overallUptime, 'uptime', { dataKey: 'uptime' })[0]}
            </Typography>
          </Grid>
        </Grid>
        <Chart syncId={monitor.index} data={data} timespan={timespan} dataKey='uptime' title={t('status.availability')} tickFormatter={uptimeTickFormatter} />
      </Box>

      <Box mt={2}>
        <Grid container className={classes.grid}>
          <Grid item xs={6}>
            <Typography variant='h6'>{t('status.latency')}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant='h6' align='right'>
              {overallLatency >= 0 && tooltipFormatter(overallLatency, 'latency', { dataKey: 'latency' })[0]}
            </Typography>
          </Grid>
        </Grid>
        <Chart syncId={monitor.index} data={data} timespan={timespan} dataKey='latency' title={t('status.latency')} tickFormatter={latencyTickFormatter} />
      </Box>
    </Box>
  </Paper>;
}
