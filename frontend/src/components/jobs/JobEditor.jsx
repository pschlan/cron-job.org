import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LinearProgress, Paper, makeStyles, TextField, Switch, FormControl, FormLabel,
  FormGroup, FormControlLabel, Select, MenuItem, InputLabel, TableContainer, Button,
  IconButton, Tabs, Tab, Grid, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { useSnackbar } from 'notistack';

import {
  getJobDetails, updateJob, createJob,
  deleteJob as apiDeleteJob,
  cloneJob as apiCloneJob
} from '../../utils/API';
import {
  RegexPatterns,
  RequestMethod,
  RequestMethodsSupportingCustomBody
} from '../../utils/Constants';
import useTimezones from '../../hooks/useTimezones';
import NotFound from '../misc/NotFound';
import Breadcrumbs from '../misc/Breadcrumbs';
import Table from '../misc/Table';
import JobSchedule from './JobSchedule';
import Heading from '../misc/Heading';
import ActionMenu from '../misc/ActionMenu';

import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import AlarmIcon from '@material-ui/icons/Alarm';
import TuneIcon from '@material-ui/icons/Tune';
import SaveIcon from '@material-ui/icons/Save';
import ExpandIcon from '@material-ui/icons/ExpandMore';
import ActionsIcon from '@material-ui/icons/MoreVert';
import HistoryIcon from '@material-ui/icons/History';
import CloneIcon from '@material-ui/icons/FileCopy';
import ValidatingTextField from '../misc/ValidatingTextField';
import clsx from 'clsx';
import useUserProfile from '../../hooks/useUserProfile';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  tabPanel: {
    padding: theme.spacing(0)
  },
  fieldSet: {
    padding: theme.spacing(2),
    margin: theme.spacing(2, 0),
    '& .MuiTextField-root:not(:last-child)': {
      marginBottom: theme.spacing(2)
    },
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.spacing(0.5),
    '& legend': {
      padding: theme.spacing(0, 1)
    }
  },
  authFieldSet: {
    marginTop: - theme.spacing(0.3)
  },
  headersTable: {
    '& .MuiTextField-root': {
      margin: theme.spacing(0)
    },
  },
  headerActionButton: {
    textAlign: 'center'
  },
  requestBody: {
    '& textarea': {
      fontFamily: '"Roboto Mono", courier',
      padding: 'inherit',
      border: `1px solid ${grey[500]}`,
    }
  },
  formControl: {
    margin: theme.spacing(1)
  },
  tableContainer: {
    marginBottom: theme.spacing(2)
  }
}));

export default function JobEditor({ match }) {
  //! @todo Check URL for >/dev/null etc.

  const { t } = useTranslation();
  const classes = useStyles();
  const timezones = useTimezones();
  const userProfile = useUserProfile();
  const history = useHistory();
  const { enqueueSnackbar } = useSnackbar();

  const jobId = parseInt(match.params.jobId || -1);
  const [ isLoading, setIsLoading ] = useState(true);
  const [ job, setJob ] = useState(null);

  const [ jobTitle, setJobTitle ] = useState('');
  const [ jobURL, setJobURL ] = useState('');
  const jobURLRef = useRef();
  const [ jobEnabled, setJobEnabled ] = useState(false);
  const [ saveResponses, setSaveResponses ] = useState(false);
  const [ authEnable, setAuthEnable ] = useState(false);
  const [ authUser, setAuthUser ] = useState('');
  const [ authPassword, setAuthPassword ] = useState('');
  const [ notification, setNotification ] = useState({ onSuccess: false, onFailure: false, onDisable: true });
  const [ requestMethod, setRequestMethod ] = useState(RequestMethod.GET);
  const [ requestBody, setRequestBody ] = useState('');
  const [ jobHeaders, setJobHeaders ] = useState([]);
  const [ schedule, setSchedule ] = useState({});
  const [ timezone, setTimezone ] = useState();
  const [ tabValue, setTabValue ] = useState('common');
  const [ saving, setSaving ] = useState(false);
  const [ showDeleteJob, setShowDeleteJob ] = useState(false);

  const createMode = (jobId === -1);

  //! @todo Export, import
  //! @todo Show warning on leave if not saved?

  useEffect(() => {
    if (createMode) {
      if (!userProfile || !userProfile.timezone) {
        return;
      }
      setJob({
        url: 'http://',
        enabled: true,
        saveResponses: false,
        auth: {
          enable: false,
          user: '',
          password: ''
        },
        schedule: {
          timezone: userProfile.timezone,
          mdays: [-1 ],
          wdays: [-1],
          months: [-1],
          hours: [-1],
          minutes: [0, 15, 30, 45]
        },
        extendedData: {
          body: '',
          headers: {}
        },
        notification: {
          onSuccess: true,
          onDisable: true,
          onFailure: false
        },
        requestMethod: RequestMethod.GET
      });
    } else {
      getJobDetails(jobId)
        .then(result => setJob(result.jobDetails))
        .catch(() => setIsLoading(false));
    }
  }, [jobId, createMode, userProfile]);

  useEffect(() => {
    if (job) {
      setJobTitle(job.title);
      setJobURL(job.url);
      setJobEnabled(!!job.enabled);
      setSaveResponses(!!job.saveResponses);
      setAuthEnable(!!job.auth.enable);
      setAuthUser(job.auth.user);
      setAuthPassword(job.auth.password);
      setNotification(job.notification);
      setRequestMethod(job.requestMethod);
      setRequestBody(job.extendedData.body);
      setTimezone(job.schedule.timezone);
      setJobHeaders(Object.keys(job.extendedData.headers).reduce((prev, cur) =>
        [...prev, { key: cur, value: job.extendedData.headers[cur] }], []));
      setIsLoading(false);
    }
  }, [job]);

  function saveJob() {
    if (!jobURL.match(RegexPatterns.url)) {
      enqueueSnackbar(t('jobs.invalidUrl'), { variant: 'error' });
      jobURLRef.current && jobURLRef.current.focus();
      return;
    }

    const job = {
      title: jobTitle,
      url: jobURL,
      enabled: jobEnabled,
      saveResponses,
      auth: {
        enable: authEnable,
        user: authUser,
        password: authPassword
      },
      notification,
      requestMethod,
      extendedData: {
        body: requestBody,
        headers: jobHeaders.reduce((prev, cur) => ({...prev, [cur.key]: cur.value}), {})
      },
      schedule: {
        ...schedule,
        timezone
      }
    };

    setSaving(true);

    if (createMode) {
      createJob(job)
        .then(() => {
          enqueueSnackbar(t('jobs.created'), { variant: 'success' });
          history.push('/jobs');
        })
        .catch(() => enqueueSnackbar(t('jobs.failedToCreate'), { variant: 'error' }))
        .finally(() => setSaving(false));
    } else {
      updateJob(jobId, job)
        .then(() => getJobDetails(jobId))
        .then(result => {
          setJob(result.jobDetails);
          enqueueSnackbar(t('jobs.saved'), { variant: 'success' });
        })
        .catch(() => enqueueSnackbar(t('jobs.failedToSave'), { variant: 'error' }))
        .finally(() => setSaving(false));
    }
  }

  function deleteJob() {
    apiDeleteJob(jobId)
      .then(() => {
        enqueueSnackbar(t('jobs.deleted'), { variant: 'success' });
        history.push('/jobs');
      })
      .catch(() => enqueueSnackbar(t('jobs.failedToDelete'), { variant: 'error' }))
      .finally(() => setShowDeleteJob(false));
  }

  function cloneJob() {
    apiCloneJob(jobId, t('jobs.cloneSuffix'))
      .then(result => {
        enqueueSnackbar(t('jobs.cloned'), { variant: 'success' });
        history.push('/jobs/' + result.jobId);
      })
      .catch(() => enqueueSnackbar(t('jobs.failedToClone'), { variant: 'error' }));
  }

  if (isLoading) {
    return <LinearProgress />;
  }

  if (!job) {
    return <NotFound />;
  }

  function deleteHeader(rowNo) {
    setJobHeaders(headers => headers.filter((value, index) => index !== rowNo));
  }

  function addHeader() {
    setJobHeaders(headers => [...headers, {key: '', value: ''}]);
  }

  function updateHeaderKey(rowNo, key) {
    setJobHeaders(headers => headers.map((x, index) => index === rowNo ? {...x, key} : x));
  }

  function updateHeaderValue(rowNo, value) {
    setJobHeaders(headers => headers.map((x, index) => index === rowNo ? {...x, value} : x));
  }

  const HEADERS_COLUMNS = [
    {
      cell: (item, rowNo) => <TextField
        variant='filled'
        label={t('jobs.key')}
        size='small'
        defaultValue={item.key}
        onBlur={({target}) => updateHeaderKey(rowNo, target.value)}
        fullWidth />
    },
    {
      cell: (item, rowNo) => <TextField
        variant='filled'
        label={t('jobs.value')}
        size='small'
        defaultValue={item.value}
        onBlur={({target}) => updateHeaderValue(rowNo, target.value)}
        fullWidth />
    },
    {
      cell: (item, rowNo) => <IconButton
                                size='small'
                                onClick={() => deleteHeader(rowNo)}
                                title={t('common.delete')}
                                aria-label={t('common.delete')}>
                                <DeleteIcon />
                              </IconButton>
    }
  ];

  return <>
    <Breadcrumbs items={[
        {
          href: '/jobs',
          text: t('common.cronjobs')
        },
        createMode ? {
          href: '/jobs/create',
          text: t('jobs.createJob')
        } : {
          href: '/jobs/' + jobId,
          text: job.title || job.url
        }
      ]} />
    <Heading
      actionButtons={!createMode &&
        <ActionMenu
          variant='contained'
          size='small'
          items={[
            {
              icon: <HistoryIcon fontSize='small' />,
              text: t('jobs.executionHistory'),
              href: '/jobs/' + jobId + '/history'
            },
            {
              icon: <CloneIcon fontSize='small' />,
              text: t('common.clone'),
              onClick: () => cloneJob()
            },
            {
              icon: <DeleteIcon fontSize='small' />,
              text: t('common.delete'),
              onClick: () => setShowDeleteJob(true)
            }
          ]}
          onClickItem={item => item.href ? history.push(item.href) : item.onClick()}
          startIcon={<ActionsIcon />}
          endIcon={<ExpandIcon />}
          text={t('common.actions')}
          />}
      >
      {createMode ? t('jobs.createJob') : t('jobs.editJobHeading', { jobTitle: job.title || job.url })}
    </Heading>
    <Tabs
      value={tabValue}
      onChange={(e, val) => setTabValue(val)}
      indicatorColor="primary"
      textColor="primary">
      <Tab label={t('jobs.common')} icon={<AlarmIcon />} value='common' />
      <Tab label={t('jobs.advanced')} icon={<TuneIcon />} value='advanced' />
    </Tabs>
    <div hidden={tabValue!=='common'} className={classes.tabPanel}>
      <Paper className={classes.paper}>
        <fieldset className={classes.fieldSet}>
          <TextField
            label={t('jobs.title')}
            defaultValue={jobTitle}
            onBlur={({target}) => setJobTitle(target.value)}
            InputLabelProps={{shrink: true}}
            fullWidth
            />
          <ValidatingTextField
            label={t('jobs.url')}
            defaultValue={jobURL}
            pattern={RegexPatterns.url}
            patternErrorText={t('jobs.invalidUrl')}
            onBlur={({target}) => setJobURL(target.value.trim())}
            inputRef={jobURLRef}
            InputLabelProps={{shrink: true}}
            fullWidth
            required
            />
          <FormControlLabel
            control={<Switch
              checked={jobEnabled}
              onChange={({target}) => setJobEnabled(target.checked)}
              />}
            label={t('jobs.enableJob')}
            />
          <FormControlLabel
            control={<Switch
              checked={saveResponses}
              onChange={({target}) => setSaveResponses(target.checked)}
              />}
            label={t('jobs.saveResponses')}
            />
        </fieldset>

        <fieldset className={classes.fieldSet}>
          <FormLabel component='legend'>{t('jobs.executionSchedule')}</FormLabel>
          <JobSchedule initialSchedule={job.schedule || {}} onChange={sched => setSchedule(sched)} />
        </fieldset>

        <fieldset className={classes.fieldSet}>
          <FormLabel component='legend'>{t('jobs.notifymewhen')}</FormLabel>
          <FormGroup>
            <FormControlLabel
              control={<Switch
                checked={notification.onFailure}
                onChange={({target}) => setNotification(x => ({...x, onFailure: target.checked}))}
                />}
              label={t('jobs.notifyOn.onFailure')}
              />
            <FormControlLabel
              control={<Switch
                checked={notification.onSuccess}
                onChange={({target}) => setNotification(x => ({...x, onSuccess: target.checked}))}
                />}
              label={t('jobs.notifyOn.onSuccess')}
              />
            <FormControlLabel
              control={<Switch
                checked={notification.onDisable}
                onChange={({target}) => setNotification(x => ({...x, onDisable: target.checked}))}
                />}
              label={t('jobs.notifyOn.onDisable')}
              />
          </FormGroup>
        </fieldset>
      </Paper>
    </div>

    <div hidden={tabValue!=='advanced'} className={classes.tabPanel}>
      <Paper className={classes.paper}>
        <fieldset className={clsx(classes.fieldSet, classes.authFieldSet)}>
          <FormLabel component='legend'>
            <FormControlLabel
              control={<Switch
                checked={authEnable}
                onChange={({target}) => setAuthEnable(target.checked)}
                />}
              label={t('jobs.requireshttpauth')}
              />
          </FormLabel>

          <TextField
            label={t('jobs.username')}
            defaultValue={authUser}
            disabled={!authEnable}
            onBlur={({target}) => setAuthUser(target.value)}
            InputLabelProps={{shrink: true}}
            fullWidth
            />
          <TextField
            label={t('jobs.password')}
            defaultValue={authPassword}
            type='password'
            disabled={!authEnable}
            onBlur={({target}) => setAuthPassword(target.value)}
            InputLabelProps={{shrink: true}}
            fullWidth
            />
        </fieldset>

        <fieldset className={classes.fieldSet}>
          <FormLabel component='legend'>{t('jobs.headers')}</FormLabel>

          <TableContainer className={classes.tableContainer}>
            <Table
              size='small'
              className={classes.headersTable}
              columns={HEADERS_COLUMNS}
              items={jobHeaders}
              empty={<em>{t('jobs.noheaders')}</em>}
              noHeader
              />
          </TableContainer>

          <Grid container direction='row' justify='flex-end'>
            <Grid item>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addHeader()}
                >{t('common.add')}</Button>
            </Grid>
          </Grid>
        </fieldset>

        <fieldset className={classes.fieldSet}>
          <FormLabel component='legend'>{t('jobs.advanced')}</FormLabel>
          <FormGroup>
            <FormControl className={classes.formControl}>
              <InputLabel shrink id='timezone-label'>
                {t('jobs.timezone')}
              </InputLabel>
              <Select
                value={timezones.length ? timezone : ''}
                onChange={({target}) => setTimezone(target.value)}
                labelId='timezone-label'>
                {timezones.map(zone =>
                  <MenuItem value={zone} key={zone}>{zone}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl className={classes.formControl}>
              <InputLabel shrink id='request-method-label'>
                {t('jobs.requestMethod')}
              </InputLabel>
              <Select
                value={requestMethod}
                onChange={({target}) => setRequestMethod(target.value)}
                labelId='request-method-label'>
                {Object.keys(RequestMethod).map(method =>
                  <MenuItem value={RequestMethod[method]} key={method}>{method}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl className={classes.formControl}>
              <TextField
                label={t('jobs.requestBody')}
                className={classes.requestBody}
                defaultValue={requestBody}
                onBlur={({target}) => setRequestBody(target.value)}
                disabled={!RequestMethodsSupportingCustomBody.includes(requestMethod)}
                multiline
                rows={8}
                rowsMax={8}
                InputLabelProps={{shrink: true}}
                fullWidth
                />
            </FormControl>
          </FormGroup>
        </fieldset>
      </Paper>
    </div>

    <Grid container direction='row' justify='flex-end'>
      <Grid item>
        <Button
          variant='contained'
          color='primary'
          startIcon={saving ? <CircularProgress size='small' /> : <SaveIcon />}
          onClick={() => saveJob()}
          disabled={saving}>
          {createMode ? t('common.create') : t('common.save')}
        </Button>
      </Grid>
    </Grid>

    {showDeleteJob && <Dialog open={true} onClose={() => setShowDeleteJob(false)}>
      <DialogTitle>
        {t('jobs.deleteJob', { jobTitle: job.title || job.url })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {job.type === 1 ? t('jobs.cantDeleteMonitorJob') : t('jobs.confirmDeleteJob')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={() => setShowDeleteJob(false)}>
          {t('common.cancel')}
        </Button>
        {job.type !== 1 && <Button color='primary' onClick={() => deleteJob()}>
          {t('common.delete')}
        </Button>}
      </DialogActions>
    </Dialog>}
  </>;
}
