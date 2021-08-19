import { Box, Grid, LinearProgress, Paper } from '@material-ui/core';
import { useSnackbar } from 'notistack';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../misc/Breadcrumbs';
import Heading from '../misc/Heading';
import { getServiceStatistics } from '../../utils/API';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import moment from 'moment';
import { formatMs } from '../../utils/Units';
import { ChartColors } from '../../utils/Constants';
import Title from '../misc/Title';
import NumberPanel from '../misc/NumberPanel';
import useViewport from '../../hooks/useViewport';

export default function Statistics() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [ stats, setStats ] = useState(null);
  const [ domains, setDomains ] = useState({});
  const { isMobile } = useViewport();

  useEffect(() => {
    getServiceStatistics()
      .then(result => {
        const executionsMin = Math.min(...result.executionStats.samples.map(x => x.sumExecutions));
        const executionsMax = Math.max(...result.executionStats.samples.map(x => x.sumExecutions));
        const avgJitterMin = Math.min(...result.executionStats.samples.map(x => x.averageJitter));
        const avgJitterMax = Math.max(...result.executionStats.samples.map(x => x.averageJitter));

        setDomains({
          numExecutions: [
            executionsMin - Math.max(0, (executionsMax - executionsMin)),
            executionsMax
          ],
          averageJitter: [
            avgJitterMin,
            avgJitterMax + Math.max(0, (avgJitterMax - avgJitterMin))
          ]
        });

        setStats(result);
      })
      .catch(() => enqueueSnackbar(t('statistics.requestFailed'), { variant: 'error' }));
  }, [enqueueSnackbar, t]);

  function formatTooltip(value, name, { dataKey }) {
    switch (dataKey) {
    case 'sumExecutions':
      return [ value.toLocaleString(), name ];
    case 'averageJitter':
      return [ formatMs(value, t), name ];
    default:
      return [ value, name ];
    }
  }

  return <>
    <Breadcrumbs items={[
        {
          href: '/statistics',
          text: t('common.statistics')
        }
      ]} />
    <Heading>
      {t('common.statistics')}
    </Heading>

    <Grid container spacing={2}>
      <Grid item sm={4} xs={12}>
        {stats ? <NumberPanel number={stats.commonStats.numUsers.toLocaleString()} label={t('statistics.users')} />: <LinearProgress />}
      </Grid>
      <Grid item sm={4} xs={12}>
        {stats ? <NumberPanel number={stats.commonStats.numJobs.toLocaleString()} label={t('statistics.cronjobs')} />: <LinearProgress />}
      </Grid>
      <Grid item sm={4} xs={12}>
        {stats ? <NumberPanel number={stats.executionStats.last24Hours.toLocaleString()} label={t('statistics.executionsInLast24Hours')} /> : <LinearProgress />}
      </Grid>
      <Grid item xs={12}>
        <Paper>
            <Title>{t('statistics.executionsAndJitter')}</Title>
            <Box p={3}>
              {stats ? <ResponsiveContainer width='100%' height={300}>
                <LineChart data={stats.executionStats.samples}>
                  <CartesianGrid strokeDasharray='5 5' />

                  <XAxis dataKey='timestamp' type='category' tickFormatter={value => moment(value*1000).format('LT')} interval={isMobile ? 6 : 2} />
                  <YAxis yAxisId={1} type='number' tickFormatter={x => formatMs(x, t)} tickCount={10} domain={domains.averageJitter} />
                  <YAxis yAxisId={2} type='number' tickFormatter={x => x.toLocaleString()} tickCount={10} orientation='right' domain={domains.numExecutions} />

                  <Tooltip labelFormatter={value => moment(value*1000).format('LLL')} formatter={formatTooltip} />
                  <Legend />

                  <Line type='monotone' dataKey='sumExecutions' yAxisId={2} stroke={ChartColors[3]} name={t('statistics.sumExecutions')} />
                  <Line type='monotone' dataKey='averageJitter' yAxisId={1} stroke={ChartColors[1]} name={t('statistics.averageJitter')} />
                </LineChart>
            </ResponsiveContainer> : <LinearProgress />}
          </Box>
        </Paper>
      </Grid>

    </Grid>
  </>;
}