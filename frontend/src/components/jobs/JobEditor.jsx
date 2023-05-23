import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  LinearProgress, Paper, makeStyles, TextField, Switch, FormControl, FormLabel,
  FormGroup, FormControlLabel, Select, MenuItem, InputLabel, TableContainer, Button,
  IconButton, Tabs, Tab, Grid, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, InputAdornment
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
import TestIcon from '@material-ui/icons/PlayCircleOutline';
import TimerIcon from '@material-ui/icons/Timer';
import ExportIcon from '@material-ui/icons/ImportExport';
import FolderIcon from '@material-ui/icons/FolderOutlined';
import ValidatingTextField from '../misc/ValidatingTextField';
import clsx from 'clsx';
import useUserProfile from '../../hooks/useUserProfile';
import JobTestRun from './JobTestRun';
import JobExport from './JobExport';
import useFolder from '../../hooks/useFolder';

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
  const { folderId, folderBreadcrumb, urlPrefix, folders } = useFolder(match);

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
  const requestTimeoutRef = useRef();
  const [ jobEnabled, setJobEnabled ] = useState(false);
  const [ saveResponses, setSaveResponses ] = useState(false);
  const [ requestTimeout, setRequestTimeout ] = useState(-1);
  const [ redirectSuccess, setRedirectSuccess ] = useState(false);
  const [ authEnable, setAuthEnable ] = useState(false);
  const [ authUser, setAuthUser ] = useState('');
  const [ authPassword, setAuthPassword ] = useState('');
  const [ notification, setNotification ] = useState({ onSuccess: false, onFailure: false, onDisable: true });
  const [ requestMethod, setRequestMethod ] = useState(RequestMethod.GET);
  const [ requestBody, setRequestBody ] = useState('');
  const [ jobHeaders, setJobHeaders ] = useState([]);
  const [ schedule, setSchedule ] = useState({});
  const [ timezone, setTimezone ] = useState();
  const [ jobFolderId, setJobFolderId ] = useState();
  const [ tabValue, setTabValue ] = useState('common');
  const [ saving, setSaving ] = useState(false);
  const [ showDeleteJob, setShowDeleteJob ] = useState(false);
  const [ showTestRun, setShowTestRun ] = useState(false);
  const [ showExportJob, setShowExportJob ] = useState(false);
  const [ updatedJob, setUpdatedJob ] = useState({});

  const createMode = (jobId === -1);

  //! @todo Export, import
  //! @todo Show warning on leave if not saved?

  useEffect(() => {
    if (createMode) {
      if (!userProfile || !userProfile.userProfile || !userProfile.userProfile.timezone) {
        return;
      }
      setJob({
        url: 'http://',
        enabled: true,
        saveResponses: false,
        requestTimeout: Math.min(30, userProfile.userGroup.requestTimeout),
        redirectSuccess: false,
        auth: {
          enable: false,
          user: '',
          password: ''
        },
        schedule: {
          timezone: userProfile.userProfile.timezone,
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
          onSuccess: false,
          onDisable: true,
          onFailure: false
        },
        requestMethod: RequestMethod.GET,
        folderId
      });
    } else {
      getJobDetails(jobId)
        .then(result => setJob(result.jobDetails))
        .catch(() => setIsLoading(false));
    }
  }, [jobId, createMode, userProfile, folderId]);

  useEffect(() => {
    if (job && userProfile && userProfile.userGroup) {
      setJobTitle(job.title);
      setJobURL(job.url);
      setJobEnabled(!!job.enabled);
      setSaveResponses(!!job.saveResponses);
      setRequestTimeout(job.requestTimeout > 0 ? Math.min(job.requestTimeout, userProfile.userGroup.requestTimeout) : userProfile.userGroup.requestTimeout);
      setRedirectSuccess(job.redirectSuccess);
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
      setJobFolderId(job.folderId);

      if (job.folderId !== folderId) {
        if (job.folderId === 0) {
          history.push('/jobs/' + job.jobId);
        } else {
          history.push('/jobs/folders/' + job.folderId + '/' + job.jobId)
        }
      }
    }
  }, [job, userProfile, folderId, history]);

  useEffect(() => {
    setUpdatedJob({
      title: jobTitle,
      url: jobURL,
      enabled: jobEnabled,
      saveResponses,
      requestTimeout,
      redirectSuccess,
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
      },
      folderId: jobFolderId
    });
  }, [jobTitle, jobURL, jobEnabled, saveResponses, requestTimeout, redirectSuccess, authEnable, authUser, authPassword, notification, requestMethod, requestBody, jobHeaders, schedule, timezone, jobFolderId]);

  const maxRequestTimeout = (userProfile && userProfile.userGroup && userProfile.userGroup.requestTimeout) || 30;

  function saveJob() {
    if (!jobURL.match(RegexPatterns.url)) {
      enqueueSnackbar(t('jobs.invalidUrl'), { variant: 'error' });
      jobURLRef.current && jobURLRef.current.focus();
      return;
    }

    if (updatedJob.requestTimeout > maxRequestTimeout) {
      enqueueSnackbar(t('jobs.invalidTimeout', { maxRequestTimeout }), { variant: 'error' });
      requestTimeoutRef.current && requestTimeoutRef.current.focus();
      return;
    }

    setSaving(true);

    if (createMode) {
      createJob(updatedJob)
        .then(() => {
          enqueueSnackbar(t('jobs.created'), { variant: 'success' });
          history.push(jobFolderId === 0 ? '/jobs' : '/jobs/folders/' + jobFolderId);
        })
        .catch(() => enqueueSnackbar(t('jobs.failedToCreate'), { variant: 'error' }))
        .finally(() => setSaving(false));
    } else {
      updateJob(jobId, updatedJob)
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
        history.push(urlPrefix);
      })
      .catch(() => enqueueSnackbar(t('jobs.failedToDelete'), { variant: 'error' }))
      .finally(() => setShowDeleteJob(false));
  }

  function cloneJob() {
    apiCloneJob(jobId, t('jobs.cloneSuffix'))
      .then(result => {
        enqueueSnackbar(t('jobs.cloned'), { variant: 'success' });
        history.push(urlPrefix + '/' + result.jobId);
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

  function updateUrl(url) {
    setJobURL(url);
    setTabValue('common');
    if (jobURLRef.current) {
      jobURLRef.current.value = url;
    }
    setShowTestRun(false);
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
        ...folderBreadcrumb,
        createMode ? {
          href: urlPrefix + '/create',
          text: t('jobs.createJob')
        } : {
          href: urlPrefix + '/' + jobId,
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
              href: urlPrefix + '/' + jobId + '/history'
            },
            {
              icon: <CloneIcon fontSize='small' />,
              text: t('common.clone'),
              onClick: () => cloneJob()
            },
            {
              icon: <ExportIcon fontSize='small' />,
              text: t('common.export'),
              onClick: () => setShowExportJob(true)
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
          <div>
            <InputLabel shrink id='folder-label'>
              {t('jobs.folder')}
            </InputLabel>
            <Select
              value={folders ? jobFolderId : ''}
              onChange={({target}) => setJobFolderId(target.value)}
              labelId='folder-label'
              startAdornment={<InputAdornment position='start'><FolderIcon /></InputAdornment>}
              fullWidth>
                <MenuItem value={0}>-</MenuItem>
              {folders.map(folder =>
                <MenuItem value={folder.folderId} key={folder.folderId}>{folder.title}</MenuItem>)}
            </Select>
          </div>
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
            <FormControl className={classes.formControl}>
              <ValidatingTextField
                validator={value => parseInt(value) <= maxRequestTimeout}
                label={t('jobs.requestTimeout')}
                defaultValue={Math.min(maxRequestTimeout, requestTimeout)}
                onBlur={({target}) => setRequestTimeout(parseInt(target.value))}
                onClick={({target}) => setRequestTimeout(parseInt(target.value))}
                InputLabelProps={{shrink: true}}
                InputProps={{
                  startAdornment: <InputAdornment position='start'><TimerIcon /></InputAdornment>,
                  endAdornment: <InputAdornment position='end'>{t('units.long.s')}</InputAdornment>
                }}
                inputProps={{min: 1, max: maxRequestTimeout, type: 'number'}}
                patternErrorText={t('jobs.invalidTimeout', {maxRequestTimeout})}
                inputRef={requestTimeoutRef}
                />
            </FormControl>
            <FormControl className={classes.formControl}>
              <FormControlLabel
                control={<Switch
                  checked={redirectSuccess}
                  onChange={({target}) => setRedirectSuccess(target.checked)}
                  />}
                label={t('jobs.redirectSuccess')}
                />
            </FormControl>
          </FormGroup>
        </fieldset>
      </Paper>
    </div>

    <Grid container direction='row' justify='flex-end' spacing={1}>
      <Grid item>
        <Button
          startIcon={<TestIcon />}
          onClick={() => setShowTestRun(true)}>
          {t('jobs.testRun.testRun')}
        </Button>
      </Grid>
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

    {showTestRun && <JobTestRun onClose={() => setShowTestRun(false)} onUpdateUrl={updateUrl} jobId={jobId} job={updatedJob} />}

    {showExportJob && <JobExport onClose={() => setShowExportJob(false)} job={updatedJob} />}

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
