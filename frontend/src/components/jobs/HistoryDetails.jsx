import React, { useState, useRef, useEffect } from 'react';
import { Button, makeStyles, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, LinearProgress } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { JobStatus, jobStatusText, ChartColors, TimingFields } from '../../utils/Constants';
import { getJobHistoryDetails } from '../../utils/API';
import moment from 'moment';
import { BarChart, Bar, ResponsiveContainer, Legend, XAxis, YAxis, Tooltip } from 'recharts';
import { formatMs } from '../../utils/Units';

const useStyles = makeStyles((theme) => ({
  actionButton: {
    margin: theme.spacing(1)
  },
  code: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    height: theme.spacing(20),
    overflowY: 'scroll',
    fontFamily: '"Roboto Mono", courier',
    whiteSpace: 'pre-wrap'
  }
}));

function Code({ children }) {
  const classes = useStyles();
  return <Box className={classes.code} border={1} borderColor="grey.500">
    {children}
  </Box>;
}

export default function HistoryDetails({ log, open, onClose }) {
  const { t } = useTranslation();
  const [ isLoading, setIsLoading ] = useState(true);
  const onCloseHook = useRef(onClose, []);
  const [ details, setDetails ] = useState({});
  const [ timingData, setTimingData ] = useState(null);

  useEffect(() => {
    getJobHistoryDetails(log.identifier)
      .then(result => setDetails(result.jobHistoryDetails))
      .catch(error => console.log(error))
      .finally(() => setIsLoading(false));
  }, [log]);

  useEffect(() => {
    if (Math.max(...Object.values(details.stats || {})) === 0) {
      setTimingData(null);
      return;
    }

    setTimingData(details.stats ? [
      TimingFields.reduce((prev, cur) => ({
        fields: {
          ...prev.fields,
          [cur]: Math.round(Math.max(0, ((details.stats || {})[cur] - prev.lastValue)) / 10) / 100
        },
        lastValue: Math.max(prev.lastValue, (details.stats || {})[cur])
      }), { fields: {}, lastValue: 0 }).fields,
    ] : null);
  }, [details]);

  function formatLegend(value) {
    return t(`jobs.timingItem.${value}`);
  }

  function formatTooltip(value, name, props) {
    return [
      formatMs(value, t),
      t(`jobs.timingItem.${name}`)
    ];
  }

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
          {[JobStatus.OK, JobStatus.FAILED_HTTPERROR].includes(log.status) ? <div>
              {log.httpStatus} {log.statusText}
            </div> : <div>{t('jobs.statuses.' + jobStatusText(log.status))}</div>}
        </Typography>

        {timingData && <>
          <Typography variant='overline'>{t('jobs.timing')}</Typography>
          <div>
            <ResponsiveContainer width='100%' height={100}>
              <BarChart data={timingData} layout='vertical'>
                <XAxis
                  type='number'
                  domain={[0, timingData[0].total]}
                  tickCount={10}
                  tickFormatter={x => formatMs(x, t)} />
                <YAxis
                  dataKey='name'
                  type='category'
                  hide={true}
                  />

                <Legend formatter={formatLegend} />
                <Tooltip formatter={formatTooltip} />

                {TimingFields.map((item, index) =>
                  <Bar dataKey={item} key={item} stackId='timing' fill={ChartColors[index]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {isLoading ?
          <LinearProgress /> :
          <>
            {details.headers && <>
              <Typography variant='overline'>{t('jobs.responseHeaders')}</Typography>
              <Code>{details.headers}</Code>
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
