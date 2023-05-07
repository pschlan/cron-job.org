import React, { useState } from 'react';
import { Paper, makeStyles, TableContainer, Link, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import Table from '../misc/Table';
import moment from 'moment';
import { jobStatusText } from '../../utils/Constants';
import AddIcon from '@material-ui/icons/AlarmAdd';
import EditIcon from '@material-ui/icons/Edit';
import HistoryIcon from '@material-ui/icons/History';
import EnableIcon from '@material-ui/icons/AlarmOnOutlined';
import DisableIcon from '@material-ui/icons/AlarmOffOutlined';
import DeleteIcon from '@material-ui/icons/Delete';
import { useHistory } from 'react-router-dom';
import Breadcrumbs from '../misc/Breadcrumbs';
import useJobs from '../../hooks/useJobs';
import Heading from '../misc/Heading';
import { formatMs } from '../../utils/Units';
import JobIcon from './JobIcon';
import { executeJobMassAction } from '../../utils/API';
import { useSnackbar } from 'notistack';

const useStyles = makeStyles((theme) => ({
  actionButton: {
    margin: theme.spacing(1)
  }
}));

const REFRESH_INTERVAL = 60000;

export default function Jobs() {
  const classes = useStyles();
  const { jobs, loading: isLoading, refresh: refreshJobs } = useJobs(REFRESH_INTERVAL);
  const { t } = useTranslation();
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const [confirmJobMassAction, setConfirmJobMassAction] = useState(null);

  function jobMassAction(jobIds, action) {
    executeJobMassAction(jobIds, action)
      .then(() => {
        enqueueSnackbar(t('common.massActionSucceeded'), { variant: 'success' });
      })
      .catch(() => {
        enqueueSnackbar(t('common.massActionFailed'), { variant: 'error' });
      })
      .finally(() => refreshJobs());
  }

  const COLUMNS = [
    {
      head: t('jobs.titleurl'),
      cell: job => <div style={{display: 'flex', alignItems: 'center'}}>
        <JobIcon status={job.lastStatus} enabled={job.enabled} hasNextExecution={!!job.nextExecution} />
        <div>
          <div>{job.title}</div>
          <div style={{maxWidth: 300, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis'}}><Typography variant="caption" noWrap={true}><Link href={job.url} target="_blank" rel="noopener nofollow">{job.url}</Link></Typography></div>
        </div>
      </div>
    },
    {
      head: t('jobs.lastExecution'),
      cell: job => job.lastExecution ? <>
          <div>{moment(job.lastExecution * 1000).calendar()}</div>
          <div><Typography variant="caption">
              {t('jobs.statuses.' + jobStatusText(job.lastStatus))}
              &nbsp;({formatMs(job.lastDuration, t)})
            </Typography></div>
        </> : <>-</>
    },
    {
      head: t('jobs.nextExecution'),
      cell: job => <>
        {job.enabled ? <>
          {job.nextExecution ? moment(job.nextExecution * 1000).calendar() : '-'}
        </> : <>{t('jobs.inactive')}</>}
      </>
    },
    {
      head: t('common.actions'),
      cell: job => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<HistoryIcon />}
          className={classes.actionButton}
          onClick={() => history.push('/jobs/' + job.jobId + '/history')}
          >
          {t('jobs.history')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          className={classes.actionButton}
          onClick={() => history.push('/jobs/' + job.jobId)}
          >
          {t('common.edit')}
        </Button>
      </>
    }
  ];

  const MULTI_ACTIONS = [
    {
      icon: <EnableIcon />,
      text: t('common.enable'),
      onExecute: rows => jobMassAction(rows, 'enable')
    },
    {
      icon: <DisableIcon />,
      text: t('common.disable'),
      onExecute: rows => jobMassAction(rows, 'disable')
    },
    {
      divider: true
    },
    {
      icon: <DeleteIcon />,
      text: t('common.delete'),
      onExecute: rows => setConfirmJobMassAction({ rows, action: 'delete' })
    }
  ];

  return <>
    <Breadcrumbs items={[
        {
          href: '/jobs',
          text: t('common.cronjobs')
        }
      ]} />
    <Heading actionButtons={<>
        <Button
          variant='contained'
          size='small'
          startIcon={<AddIcon />}
          color='primary'
          onClick={() => history.push('/jobs/create')}
          >{t('jobs.createJob')}</Button>
      </>}>
      {t('common.cronjobs')}
    </Heading>
    <TableContainer component={Paper}>
      <Table
        columns={COLUMNS}
        items={jobs || []}
        empty={<em>{t('jobs.nojobs')}</em>}
        loading={isLoading}
        rowIdentifier='jobId'
        multiSelect={true}
        multiActions={MULTI_ACTIONS}
        />
    </TableContainer>

    {confirmJobMassAction !== null && <Dialog open={true} onClose={() => setConfirmJobMassAction(null)}>
      <DialogTitle>{t('common.confirmMassDeleteTitle', { count: confirmJobMassAction.rows.length })}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('common.confirmMassDeleteText', { count: confirmJobMassAction.rows.length })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmJobMassAction(null)}>
          {t('common.cancel')}
        </Button>
        <Button autoFocus color='primary' onClick={() => {
          jobMassAction(confirmJobMassAction.rows, confirmJobMassAction.action);
          setConfirmJobMassAction(null);
        }}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>}
  </>;
}
