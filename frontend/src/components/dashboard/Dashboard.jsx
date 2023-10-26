import React from 'react';
import { Paper, makeStyles, Typography, Button, TableContainer, Grid, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import Title from '../misc/Title';
import Table from '../misc/Table';
import { getDashboard, reenableUserNotifications, updateUserNewsletterSubscribe } from '../../utils/API';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useState, useCallback } from 'react';
import { setDashboardData, setUserProfile } from '../../redux/actions';
import Breadcrumbs from '../misc/Breadcrumbs';
import Heading from '../misc/Heading';
import moment from 'moment';
import { JobStatus, jobStatusText, notificationTypeText, SubscriptionStatus } from '../../utils/Constants';
import JobIcon from '../jobs/JobIcon';
import NotificationsIcon from '@material-ui/icons/Notifications';
import IconAvatar from '../misc/IconAvatar';
import YesIcon from '@material-ui/icons/Check';
import NoIcon from '@material-ui/icons/Close';
import DetailsIcon from '@material-ui/icons/MoreVert';
import { useHistory } from 'react-router-dom';
import NumberPanel from '../misc/NumberPanel';
import AddIcon from '@material-ui/icons/AlarmAdd';
import { Config } from '../../utils/Config';
import useLanguageCode from '../../hooks/useLanguageCode';
import { useSnackbar } from 'notistack';
import useUserProfile from '../../hooks/useUserProfile';
import LearnMoreIcon from '@material-ui/icons/Loyalty';
import SubscribeDialog from '../settings/SubscribeDialog';
import { Alert, AlertTitle } from '@material-ui/lab';
import EmailIcon from '@material-ui/icons/Email';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    display: 'flex',
    overflow: 'auto',
    flexDirection: 'column'
  },
  actionButton: {
    margin: theme.spacing(1)
  }
}));

function EventDescription({ type, details }) {
  const { t } = useTranslation();

  if (type === 'HistoryItem') {
    return <div style={{display: 'flex', alignItems: 'center'}}>
      <JobIcon enabled={true} status={details.status} />
      <div>
        <div>
          {t('events.cronjobExecution', {
            statusText: t('jobs.statuses.' + jobStatusText(details.status))
          })}
          {[JobStatus.OK, JobStatus.FAILED_HTTPERROR].includes(details.status) && <>
            &nbsp;({details.httpStatus} {details.statusText})
          </>}
        </div>
        <div>
          <Typography variant="caption">
            {details.url}
          </Typography>
        </div>
      </div>
    </div>;
  } else if (type === 'NotificationItem') {
    return <div style={{display: 'flex', alignItems: 'center'}}>
      <IconAvatar icon={NotificationsIcon} color='blue' />
      <div>
        <div>
          {t('events.notificationSent', {
            notificationType: t('events.notifications.' + notificationTypeText(details.type))
          })}
        </div>
        <div>
          <Typography variant="caption">
            {details.url}
          </Typography>
        </div>
      </div>
    </div>;
  }
  return <></>;
}

const REFRESH_INTERVAL = 60000;

export default function Dashboard() {
  const classes = useStyles();
  const dashboardData = useSelector(state => state.dashboard);
  const { t } = useTranslation();
  const [ isLoading, setIsLoading ] = useState(true);
  const dispatch = useDispatch();
  const history = useHistory();
  const [ savingNewsletter, setSavingNewsletter ] = useState(false);
  const [ reenablingNotifications, setReenablingNotifications ] = useState(false);
  const languageCode = useLanguageCode();
  const { enqueueSnackbar } = useSnackbar();
  const userProfile = useUserProfile();
  const [ showSubscribeDialog, setShowSubscribeDialog ] = useState(false);

  const doRefresh = useCallback(async () => {
    return getDashboard()
      .then(result => dispatch(setDashboardData(result)))
      .finally(() => setIsLoading(false));
  }, [dispatch]);

  function subscribeNewsletter(subscribe) {
    setSavingNewsletter(true);
    updateUserNewsletterSubscribe(subscribe)
      .then(() => dispatch(setUserProfile(profile => Object.keys(profile).length ? {...profile, newsletterSubscribe: subscribe} : {})))
      .then(doRefresh)
      .then(() => {
        enqueueSnackbar(t('dashboard.newsletterSaved'), { variant: 'success' });
      })
      .catch(() => enqueueSnackbar(t('dashboard.failedToSaveNewsletter'), { variant: 'error' }))
      .finally(() => setSavingNewsletter(false));
  }

  function reenableNotifications() {
    setReenablingNotifications(true);
    reenableUserNotifications()
      .then(doRefresh)
      .then(() => {
        enqueueSnackbar(t('dashboard.bounceWarning.reenableSuccess'), { variant: 'success' });
      })
      .catch(() => enqueueSnackbar(t('dashboard.bounceWarning.reenableFailed'), { variant: 'error' }))
      .finally(() => setReenablingNotifications(false));
  }

  useEffect(() => {
    doRefresh();
    const handle = window.setInterval(doRefresh, REFRESH_INTERVAL);
    return () => window.clearInterval(handle);
  }, [dispatch, t, doRefresh]);

  const LAST_EVENTS_COLUMNS = [
    {
      head: t('common.event'),
      cell: item => <EventDescription {...item} />
    },
    {
      head: t('common.date'),
      cell: event => moment(event.details.date * 1000).calendar()
    },
    {
      head: t('common.actions'),
      cell: event => <>
        <Button
          variant='outlined'
          size='small'
          startIcon={<DetailsIcon />}
          className={classes.actionButton}
          onClick={() => history.push('/jobs' + (event.details.jobFolderId === 0 ? '' : '/folders/' + event.details.jobFolderId) + '/' + event.details.jobId + '/history')}
          >
          {t('common.details')}
        </Button>
      </>
    }
  ];

  return <>
    <Breadcrumbs items={[
        {
          href: '/dashboard',
          text: t('common.dashboard')
        }
      ]} />
    <Heading actionButtons={<>
        <Button
          variant='contained'
          size='small'
          startIcon={<AddIcon />}
          onClick={() => history.push('/jobs/create')}
          >{t('jobs.createJob')}</Button>
      </>}>
      {t('common.dashboard')}
    </Heading>
    <Grid container spacing={2}>
      {dashboardData && dashboardData.notificationsAutoDisabled && <Grid item xs={12}>
        <Alert severity='error'>
          <AlertTitle>{t('dashboard.bounceWarning.title')}</AlertTitle>
          <div>
            {t('dashboard.bounceWarning.text')}
          </div>
          <div>
            <Grid container direction='row' justify='flex-end' spacing={2}>
              <Grid item>
              </Grid>
              <Grid item>
                <Button
                  size='small'
                  startIcon={<NotificationsIcon />}
                  onClick={() => reenableNotifications()}
                  disabled={reenablingNotifications}>
                  {t('dashboard.bounceWarning.reenable')}
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant='contained'
                  size='small'
                  color='primary'
                  startIcon={<EmailIcon />}
                  onClick={() => history.push('/settings')}>
                  {t('dashboard.bounceWarning.updateProfile')}
                </Button>
              </Grid>
            </Grid>
          </div>
        </Alert>
      </Grid>}
      <Grid item xs={6} sm={3}>
        {dashboardData && <NumberPanel number={dashboardData.enabledJobs} label={t('dashboard.enabledJobs')} />}
      </Grid>
      <Grid item xs={6} sm={3}>
        {dashboardData && <NumberPanel number={dashboardData.disabledJobs} label={t('dashboard.disabledJobs')} />}
      </Grid>
      <Grid item xs={6} sm={3}>
        {dashboardData && <NumberPanel number={dashboardData.successfulJobs} label={t('dashboard.successfulJobs')} />}
      </Grid>
      <Grid item xs={6} sm={3}>
        {dashboardData && <NumberPanel number={dashboardData.failedJobs} error={dashboardData.failedJobs>0} label={t('dashboard.failedJobs')} />}
      </Grid>
      {dashboardData && dashboardData.newsletterSubscribe === 'undefined' && <Grid item xs={12}>
          <Paper>
            <Title>{t('dashboard.newsletterTitle', { serviceName: Config.productName })}</Title>
            <Box pl={2} pr={2} pt={1} pb={2}>
              <p>{t('dashboard.newsletterText', { serviceName: Config.productName })}</p>
              <Grid container direction='row' justify='flex-end' spacing={2}>
                <Grid item>
                </Grid>
                <Grid item>
                  <Button
                    size='small'
                    startIcon={<NoIcon />}
                    onClick={() => subscribeNewsletter('no')}
                    disabled={savingNewsletter}>
                    {t('dashboard.noThanks')}
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant='contained'
                    size='small'
                    color='primary'
                    startIcon={<YesIcon />}
                    onClick={() => subscribeNewsletter('yes')}
                    disabled={savingNewsletter}>
                    {t('dashboard.subscribe')}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>}
      {Config.sustainingMembership.box.enable && userProfile && (!userProfile.userSubscription || userProfile.userSubscription.status===SubscriptionStatus.INACTIVE) && (dashboardData.successfulJobs >= Config.sustainingMembership.box.successfulJobsThreshold) && <Grid item xs={12}>
          <Paper>
            <Title>{t('dashboard.likeService', { serviceName: Config.productName })}</Title>
            <Box pl={2} pr={2} pt={1} pb={2}>
              <p>{t('dashboard.sustainingMembershipText', { serviceName: Config.productName })}</p>
              <Button
                size='small'
                variant='contained'
                startIcon={<LearnMoreIcon />}
                onClick={() => setShowSubscribeDialog(true)}
                float='right'
                >
                {t('settings.learnMore')}
              </Button>
            </Box>
          </Paper>
        </Grid>}
      {Config.donationBox.enable && dashboardData && dashboardData.successfulJobs >= Config.donationBox.successfulJobsThreshold && <Grid item xs={12}>
          <Paper>
            <Title>{t('dashboard.likeService', { serviceName: Config.productName })}</Title>
            <Box pl={2} pr={2} pt={1} pb={1}>
              <p>{t('dashboard.donateText', { serviceName: Config.productName })}</p>
              {languageCode==='de' && <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                <input type="hidden" name="cmd" value="_s-xclick" />
                <input type="hidden" name="hosted_button_id" value={Config.donationBox.hostedButtonId} />
                <p>
                  <input type="image" src="https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donateCC_LG.gif" border="0" name="submit" alt="Jetzt einfach, schnell und sicher online bezahlen – mit PayPal." />
                  <img alt="" border="0" src="https://www.paypalobjects.com/de_DE/i/scr/pixel.gif" width="1" height="1" />
                </p>
              </form>}
              {languageCode!=='de' && <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                <input type="hidden" name="cmd" value="_s-xclick" />
                <input type="hidden" name="hosted_button_id" value={Config.donationBox.hostedButtonId} />
                <p>
                  <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!" />
                  <img alt="" border="0" src="https://www.paypalobjects.com/de_DE/i/scr/pixel.gif" width="1" height="1" />
                </p>
              </form>}
            </Box>
          </Paper>
        </Grid>}
      <Grid item xs={12}>
        <Paper>
          <Title>{t('dashboard.lastevents')}</Title>
          <TableContainer>
            <Table
              size='small'
              columns={LAST_EVENTS_COLUMNS}
              items={(dashboardData && dashboardData.events) || []}
              empty={<em>{t('dashboard.noevents')}</em>}
              loading={isLoading}
              perPage={5}
              rowsPerPageOptions={[5, 10, 25]}
              />
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
    {showSubscribeDialog && <SubscribeDialog onClose={() => setShowSubscribeDialog(false)} />}
  </>;
}
