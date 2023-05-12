import React from 'react';
import Breadcrumbs from '../misc/Breadcrumbs';
import { TableContainer, Paper, LinearProgress, Typography, Button } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { useJob } from '../../hooks/useJobs';
import NotFound from '../misc/NotFound';
import { useEffect } from 'react';
import { getJobHistory } from '../../utils/API';
import Table from '../misc/Table';
import { useState } from 'react';
import moment from 'moment';
import SuccessIcon from '@material-ui/icons/Check';
import ErrorIcon from '@material-ui/icons/ErrorOutline';
import ScheduleIcon from '@material-ui/icons/Schedule';
import EditIcon from '@material-ui/icons/Edit';
import IconAvatar from '../misc/IconAvatar';
import { JobStatus, jobStatusText, TimingFields, ChartColors } from '../../utils/Constants';
import HistoryDetailsButton from './HistoryDetailsButton';
import Heading from '../misc/Heading';
import { useHistory } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, XAxis, Area, YAxis, Tooltip } from 'recharts';
import { formatMs } from '../../utils/Units';
import useViewport from '../../hooks/useViewport';
import useFolder from '../../hooks/useFolder';

const REFRESH_INTERVAL = 60000;

export default function History({ match }) {
  const { folderBreadcrumb, urlPrefix } = useFolder(match);

  const { t } = useTranslation();
  const jobId = parseInt(match.params.jobId);
  const { job, loading: pageLoading } = useJob(jobId);
  const [ history, setHistory ] = useState([]);
  const [ isLoading, setIsLoading ] = useState(true);
  const [ chartData, setChartData ] = useState(null);
  const routerHistory = useHistory();
  const { isMobile } = useViewport();

  useEffect(() => {
    const doRefresh = async () => {
      getJobHistory(jobId)
        .then(result => setHistory([
          ...result.predictions.sort((a, b) => b - a).map(x => ({
            datePlanned: x,
            isPrediction: true,
            identifier: 'pred-' + x
          })),
          ...result.history
        ]))
        .catch(() => null)
        .finally(() => setIsLoading(false));
    };

    doRefresh();

    const handle = window.setInterval(doRefresh, REFRESH_INTERVAL);
    return () => window.clearInterval(handle);
  }, [jobId]);

  useEffect(() => {
    if (!history.length || Math.max(...history.map(item => item.stats ? item.stats.total : 0)) === 0) {
      setChartData(null);
    } else {
      setChartData(history.filter(item => !item.isPrediction).map(item => ({
        ...TimingFields.reduce((prev, cur) => ({
          fields: {
            ...prev.fields,
            [cur]: Math.round(Math.max(0, ((item.stats || {})[cur] - prev.lastValue)) / 10) / 100
          },
          lastValue: Math.max(prev.lastValue, (item.stats || {})[cur])
        }), { fields: {}, lastValue: 0 }).fields,
        date: item.date
      })).sort((a, b) => a.date - b.date));
    }
  }, [history]);

  function formatTooltip(value, name) {
    return [
      formatMs(value, t),
      t(`jobs.timingItem.${name}`)
    ];
  }

  if (pageLoading) {
    return <LinearProgress />;
  }

  if (!job) {
    return <NotFound />;
  }

  const COLUMNS = [
    {
      head: t('jobs.executed'),
      cell: log => <div style={{display: 'flex', alignItems: 'center'}}>
          {log.isPrediction && <IconAvatar icon={ScheduleIcon} />}
          {log.status === JobStatus.OK && <IconAvatar color='green' icon={SuccessIcon} />}
          {log.status >= JobStatus.FAILED_DNS && <IconAvatar color='orange' icon={ErrorIcon} />}
          {!log.isPrediction && <div>{moment(log.date * 1000).calendar()}</div>}
      </div>
    },
    {
      head: t('jobs.scheduled'),
      cell: log => moment(log.datePlanned * 1000).calendar()
    },
    {
      head: t('jobs.jitter'),
      cell: log => !log.isPrediction && <>{formatMs(log.jitter, t)}</>
    },
    {
      head: t('jobs.duration'),
      cell: log => !log.isPrediction && <>{formatMs(log.duration, t)}</>
    },
    {
      head: t('jobs.status'),
      cell: log => log.isPrediction ? t('jobs.scheduled') : <>
        <div>{t('jobs.statuses.' + jobStatusText(log.status))}</div>
        {[JobStatus.OK, JobStatus.FAILED_HTTPERROR].includes(log.status) && <div><Typography variant="caption">
            {log.httpStatus} {log.statusText}
          </Typography></div>}
      </>
    },
    {
      head: t('common.actions'),
      cell: log => !log.isPrediction && <HistoryDetailsButton log={log} />
    }
  ];

  return <>
    <Breadcrumbs items={[
        {
          href: '/jobs',
          text: t('common.cronjobs')
        },
        ...folderBreadcrumb,
        {
          href: urlPrefix + '/' + jobId,
          text: job.title || job.url
        },
        {
          href: urlPrefix + '/' + jobId + '/history',
          text: t('jobs.history')
        }
      ]} />
    <Heading actionButtons={<>
        <Button
          variant='contained'
          size='small'
          startIcon={<EditIcon />}
          onClick={() => routerHistory.push(urlPrefix + '/' + jobId)}
          >{t('jobs.editJob')}</Button>
      </>}>
      {t('jobs.jobHistoryHeading', { jobTitle: job.title || job.url })}
    </Heading>
    {chartData && chartData.length > 2 && <>
        <ResponsiveContainer width='100%' height={200}>
        <AreaChart data={chartData} margin={{right: 30, left: 10, bottom: 20, top: 10}}>
          <XAxis dataKey='date' type='category' tickFormatter={value => moment(value*1000).format('LT')} interval={isMobile ? 6 : 2} />
          <YAxis type='number' tickFormatter={x => formatMs(x, t)} tickCount={3} />

          <Tooltip formatter={formatTooltip} labelFormatter={value => moment(value*1000).format('LLLL')} />

          {TimingFields.map((item, index) =>
            <Area type='monotone' dataKey={item} key={item} stackId='timing' stroke={ChartColors[index]} fill={ChartColors[index]} />)}
        </AreaChart>
      </ResponsiveContainer>
    </>}
    <TableContainer component={Paper}>
      <Table
        columns={COLUMNS}
        items={history}
        empty={<em>{t('jobs.nohistory')}</em>}
        loading={isLoading}
        rowIdentifier='identifier'
        />
    </TableContainer>
  </>;
}
