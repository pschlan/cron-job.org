import React, { useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, CircularProgress, Grid, InputLabel, LinearProgress, makeStyles, MenuItem, Paper, Select, TableContainer, Typography } from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import { createBillingPortalSession, getAPIKeys, getMFADevices, getSubscriptionLink, getUserProfile, updateUserProfile } from '../../utils/API';
import useTimezones from '../../hooks/useTimezones';
import useUserProfile from '../../hooks/useUserProfile';
import Breadcrumbs from '../misc/Breadcrumbs';
import Heading from '../misc/Heading';
import Title from '../misc/Title';
import ValidatingTextField from '../misc/ValidatingTextField';
import SaveIcon from '@material-ui/icons/Save';
import EmailIcon from '@material-ui/icons/Email';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import { useSnackbar } from 'notistack';
import { setUserProfile } from '../../redux/actions';
import { useDispatch } from 'react-redux';
import PasswordIcon from '@material-ui/icons/LockOpen';
import moment from 'moment';
import ChangePasswordDialog from './ChangePasswordDialog';
import ChangeEmailAddressDialog from './ChangeEmailAddressDialog';
import CreateMFADeviceDialog from './CreateMFADeviceDialog';
import DeleteMFADeviceDialog from './DeleteMFADeviceDialog';
import { RegexPatterns, SubscriptionStatus } from '../../utils/Constants';
import DeleteAccountDialog from './DeleteAccountDialog';
import ManageSubscriptionIcon from '@material-ui/icons/CreditCard';
import CancelSubscriptionIcon from '@material-ui/icons/Cancel';
import SubscriptionActiveIcon from '@material-ui/icons/FavoriteBorder';
import SubscriptionInactiveIcon from '@material-ui/icons/PauseCircleOutline';
import LearnMoreIcon from '@material-ui/icons/Loyalty';
import TOTPDeviceIcon from '@material-ui/icons/PhoneIphone';
import YubicoOTPDeviceIcon from '@material-ui/icons/VpnKey';
import ApiKeyIcon from '@material-ui/icons/VpnKey';
import DeleteIcon from '@material-ui/icons/Delete';
import ShowKeyIcon from '@material-ui/icons/Visibility';
import AddIcon from '@material-ui/icons/Add';
import DocsIcon from '@material-ui/icons/HelpOutline';
import EditIcon from '@material-ui/icons/Edit';
import IconAvatar from '../misc/IconAvatar';
import { Config } from '../../utils/Config';
import SubscribeDialog from './SubscribeDialog';
import Table from '../misc/Table';
import ShowAPIKeyDialog from './ShowAPIKeyDialog';
import DeleteAPIKeyDialog from './DeleteAPIKeyDialog';
import CreateAPIKeyDialog from './CreateAPIKeyDialog';
import EditAPIKeyDialog from './EditAPIKeyDialog';

const useStyles = makeStyles(theme => ({
  grid: {
    '& .MuiGrid-item': {
      padding: theme.spacing(2)
    }
  },
  paper: {
    '&:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  },
  timezoneNote: {
    color: grey[600]
  },
  signupDate: {
    paddingTop: theme.spacing(0.5)
  },
  quotaIndicator: {
    marginRight: theme.spacing(2)
  },
  actionButton: {
    margin: theme.spacing(0.5)
  }
}));

const REFRESH_INTERVAL = 2000;

export default function Settings() {
  const classes = useStyles();
  const { t } = useTranslation();
  const timezones = useTimezones();
  const userProfile = useUserProfile();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoading, setIsLoading ] = useState(true);
  const [ saving, setSaving ] = useState(false);
  const [ isLoadingManageSubscription, setIsLoadingManageSubscription ] = useState(false);
  const [ isLoadingCancelSubscription, setIsLoadingCancelSubscription ] = useState(false);

  const [ showChangePassword, setShowChangePassword ] = useState(false);
  const [ showChangeEmail, setShowChangeEmail ] = useState(false);
  const [ showDeleteAccount, setShowDeleteAccount ] = useState(false);
  const [ showSubscribeDialog, setShowSubscribeDialog ] = useState(false);

  const [ isLoadingMFADevices, setIsLoadingMFADevices ] = useState(true);
  const [ mfaDevices, setMFADevices ] = useState([]);
  const [ showCreateMFADevice, setShowCreateMFADevice ] = useState(false);
  const [ deleteMFADevice, setDeleteMFADevice ] = useState(null);

  const [ isLoadingApiKeys, setIsLoadingApiKeys ] = useState(true);
  const [ apiKeys, setApiKeys ] = useState([]);
  const [ showCreateApiKey, setShowCreateApiKey ] = useState(false);
  const [ showApiKey, setShowApiKey ] = useState(null);
  const [ deleteApiKey, setDeleteApiKey ] = useState(null);
  const [ editApiKey, setEditApiKey ] = useState(null);

  const [ firstName, setFirstName ] = useState('');
  const [ lastName, setLastName ] = useState('');
  const [ timezone, setTimezone ] = useState('');
  const [ email, setEmail ] = useState('');
  const [ newsletterSubscribe, setNewsletterSubscribe ] = useState('undefined');
  const [ signupDate, setSignupDate ] = useState(0);

  useEffect(() => {
    if (userProfile && userProfile.userProfile && Object.keys(userProfile.userProfile).length > 0) {
      setFirstName(userProfile.userProfile.firstName);
      setLastName(userProfile.userProfile.lastName);
      setTimezone(userProfile.userProfile.timezone);
      setEmail(userProfile.userProfile.email);
      setNewsletterSubscribe(userProfile.userProfile.newsletterSubscribe);
      setSignupDate(userProfile.userProfile.signupDate);
      setIsLoading(false);
    }
  }, [userProfile]);

  function refreshMFADevices() {
    setIsLoadingMFADevices(true);
    getMFADevices()
      .then(response => setMFADevices(response.mfaDevices))
      .finally(() => setIsLoadingMFADevices(false));
  }

  function refreshApiKeys() {
    setIsLoadingApiKeys(true);
    getAPIKeys()
      .then(response => setApiKeys(response.apiKeys))
      .finally(() => setIsLoadingApiKeys(false));
  }

  useEffect(() => {
    refreshMFADevices();
    refreshApiKeys();
  }, []);

  function saveSettings() {
    setSaving(true);

    const newProfile = {
      ...userProfile,
      userProfile: {
        ...userProfile.userProfile,
        firstName,
        lastName,
        timezone,
        newsletterSubscribe
      }
    };

    updateUserProfile(newProfile.userProfile)
      .then(() => {
        dispatch(setUserProfile(newProfile));
        enqueueSnackbar(t('settings.saved'), { variant: 'success' });
      })
      .catch(() => enqueueSnackbar(t('settings.saveFailed'), { variant: 'error' }))
      .finally(() => setSaving(false));
  }

  function manageSubscription() {
    setIsLoadingManageSubscription(true);

    if (userProfile.userSubscription.type === 'stripe') {
      createBillingPortalSession()
        .then(respone => window.location.href = respone.url)
        .catch(() => {
          enqueueSnackbar(t('settings.manageSubscriptionFailed'), { variant: 'error' });
          setIsLoadingManageSubscription(false);
        });
    } else if (userProfile.userSubscription.type === 'paddle') {
      getSubscriptionLink('manage')
        .then(response => window.location.href = response.url)
        .catch(() => {
          enqueueSnackbar(t('settings.manageSubscriptionFailed'), { variant: 'error' });
          setIsLoadingManageSubscription(false);
        });
    }
  }

  function cancelSubscription() {
    setIsLoadingCancelSubscription(true);

    getSubscriptionLink('cancel')
      .then(response => window.location.href = response.url)
      .catch(() => {
        enqueueSnackbar(t('settings.manageSubscriptionFailed'), { variant: 'error' });
        setIsLoadingCancelSubscription(false);
      });
  }

  const isCancelledSubscription = userProfile && userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.CANCELLED;
  const isExpiringSubscription = userProfile && userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.EXPIRING;
  const isPaymentReturn = window && window.location && window.location.search === '?checkoutSuccess=true';

  useEffect(() => {
    function doRefreshProfile() {
      getUserProfile().then(response => dispatch(setUserProfile(response)));
    }

    if (isPaymentReturn && userProfile && (!userProfile.userSubscription || userProfile.userSubscription.status !== SubscriptionStatus.ACTIVE)) {
      const handle = window.setInterval(doRefreshProfile, REFRESH_INTERVAL);
      return () => window.clearInterval(handle);
    }
  }, [isPaymentReturn, userProfile, dispatch]);

  const MFA_COLUMNS = [
    {
      head: t('settings.mfa.title'),
      cell: mfaDevice => <div style={{display: 'flex', alignItems: 'center'}}>
          <IconAvatar icon={mfaDevice.type===0 ? <TOTPDeviceIcon /> : mfaDevice.type===1 ? <YubicoOTPDeviceIcon /> : <></>} color={mfaDevice.enabled ? 'green' : 'default'} />
          <div>
            <div>{mfaDevice.title}</div>
            <div><Typography variant="caption">
              {mfaDevice.type===0 && <>{t('settings.mfa.totpDevice.title')}</>}
              {mfaDevice.type===1 && <>{t('settings.mfa.yubicoOtpDevice.title')}</>}
            </Typography></div>
          </div>
        </div>
    },
    {
      head: t('common.actions'),
      cell: mfaDevice => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setDeleteMFADevice(mfaDevice)}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  const APIKEY_COLUMNS = [
    {
      head: t('settings.apiKeys.title'),
      cell: apiKey => <div style={{display: 'flex', alignItems: 'center'}}>
          <IconAvatar icon={<ApiKeyIcon />} color={apiKey.enabled ? 'green' : 'default'} />
          <div>
            {apiKey.title}
          </div>
        </div>
    },
    {
      head: t('settings.apiKeys.ipLimit'),
      cell: apiKey => <>
        {apiKey.limitIPs.length > 0 ? <>
          {apiKey.limitIPs.slice(0, 5).join(', ')}
          {apiKey.limitIPs.length > 5 && <>...</>}
        </> : <em>{t('settings.apiKeys.unrestricted')}</em>}
      </>
    },
    {
      head: t('common.actions'),
      cell: apiKey => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShowKeyIcon />}
          className={classes.actionButton}
          onClick={() => setShowApiKey(apiKey)}
          >
          {t('settings.apiKeys.showKey')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          className={classes.actionButton}
          onClick={() => setEditApiKey(apiKey)}
          >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setDeleteApiKey(apiKey)}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  return <div>
    <Breadcrumbs items={[
        {
          href: '/settings',
          text: t('common.settings')
        }
      ]} />
    <Heading actionButtons={<ButtonGroup variant='contained' size='small'>
        <Button
          startIcon={<EmailIcon />}
          onClick={() => setShowChangeEmail(true)}
          >{t('settings.changeEmail')}</Button>
        <Button
          startIcon={<PasswordIcon />}
          onClick={() => setShowChangePassword(true)}
          >{t('settings.changePassword')}</Button>
        <Button
          startIcon={<DeleteForeverIcon />}
          onClick={() => setShowDeleteAccount(true)}
          >{t('settings.deleteAccount')}</Button>
      </ButtonGroup>}>
      {t('common.settings')}
    </Heading>

    {isLoading && <LinearProgress />}

    {!isLoading && <>
      <Paper className={classes.paper}>
        <Title>{t('settings.account')}</Title>
        <Grid container className={classes.grid}>
          <Grid item sm={6} xs={12}>
            <ValidatingTextField
              label={t('settings.email')}
              InputLabelProps={{ shrink: true }}
              defaultValue={email}
              disabled={true}
              fullWidth
              />
          </Grid>
          <Grid item sm={3} xs={12}>
            <InputLabel id='newsletter-subscribe-label' shrink={true}>{t('settings.newsletterSubscribe.title')}</InputLabel>
            <Select
              value={newsletterSubscribe}
              onChange={({target}) => setNewsletterSubscribe(target.value)}
              labelId='newsletter-subscribe-label'>
                <MenuItem value='yes' key='yes'>{t('settings.newsletterSubscribe.yes')}</MenuItem>
                <MenuItem value='no' key='no'>{t('settings.newsletterSubscribe.no')}</MenuItem>
                <MenuItem value='undefined' key='undefined'>{t('settings.newsletterSubscribe.undefined')}</MenuItem>
            </Select>
          </Grid>
          <Grid item sm={3} xs={12}>
            <Typography variant='caption' component='div'>{t('settings.memberSince')}</Typography>
            <Typography component='div' className={classes.signupDate}>{moment(signupDate*1000).calendar()}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {Config.sustainingMembership.enable && <Paper className={classes.paper}>
        <Title>{t('settings.sustainingMembership')}</Title>

        {userProfile && <>
          <Grid container className={classes.grid} alignItems='center' justifyContent='center'>
            <Grid item sm={6} xs={12}>
              <Box display='flex' alignItems='center'>
                {((userProfile.userSubscription && userProfile.userSubscription.status !== SubscriptionStatus.INACTIVE) || isPaymentReturn) ? <>
                  {(userProfile.userSubscription.status === SubscriptionStatus.PENDING || (isPaymentReturn && !userProfile.userSubscription)) && <>
                      <IconAvatar icon={SubscriptionActiveIcon} color='orange' />
                      <div>
                        {t('settings.subscriptionPending', { serviceName: Config.productName })}
                      </div>
                  </>}
                  {userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.ACTIVE && <>
                      <IconAvatar icon={SubscriptionActiveIcon} color='green' />
                      <div>
                        {t('settings.subscriptionActive', { serviceName: Config.productName })}
                      </div>
                    </>}
                  {userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.EXPIRING && <>
                      <IconAvatar icon={SubscriptionInactiveIcon} color='orange' />
                      <div>
                        {t('settings.subscriptionExpiring', { serviceName: Config.productName, expiresAt: moment(userProfile.userSubscription.cancelAt * 1000).calendar() })}
                      </div>
                    </>}
                  {userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.CANCELLED && <>
                      <IconAvatar icon={SubscriptionInactiveIcon} />
                      <div>
                        {t('settings.subscriptionInactive', { serviceName: Config.productName })}
                      </div>
                    </>}
                </> : <>
                  {t('settings.sustainingMemberTeaser', { serviceName: Config.productName })}
                </>}
              </Box>
            </Grid>
            <Grid item sm={6} xs={12} align='right'>
              <ButtonGroup variant='contained' size='small'>
                {userProfile.userSubscription && userProfile.userSubscription.type==='stripe' &&
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={isLoadingManageSubscription ? <CircularProgress size='small' /> : <ManageSubscriptionIcon />}
                    onClick={manageSubscription}
                    disabled={isLoadingManageSubscription}
                    float='right'
                    >
                    {t('settings.manageSubscription')}
                  </Button>}
                {userProfile.userSubscription && userProfile.userSubscription.type==='paddle' && userProfile.userSubscription.status === SubscriptionStatus.ACTIVE && <ButtonGroup>
                    <Button
                      size='small'
                      variant='contained'
                      startIcon={isLoadingManageSubscription ? <CircularProgress size='small' /> : <ManageSubscriptionIcon />}
                      onClick={manageSubscription}
                      disabled={isLoadingManageSubscription || isCancelledSubscription || isExpiringSubscription}
                      float='right'
                      >
                      {t('settings.updatePaymentMethod')}
                    </Button>
                    <Button
                      size='small'
                      variant='contained'
                      startIcon={isLoadingCancelSubscription ? <CircularProgress size='small' /> : <CancelSubscriptionIcon />}
                      onClick={cancelSubscription}
                      disabled={isLoadingCancelSubscription || isCancelledSubscription || isExpiringSubscription}
                      float='right'
                      >
                      {t('settings.cancelSubscription')}
                    </Button>
                  </ButtonGroup>}
                {!isPaymentReturn && ((!userProfile.userSubscription) || (userProfile.userSubscription.status === SubscriptionStatus.CANCELLED)) &&
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<LearnMoreIcon />}
                    onClick={() => setShowSubscribeDialog(true)}
                    float='right'
                    >
                    {t(isCancelledSubscription ? 'settings.becomeASustainingMember' : 'settings.learnMore')}
                  </Button>}
              </ButtonGroup>
            </Grid>
          </Grid>
        </>}
      </Paper>}

      <TableContainer component={Paper} className={classes.paper}>
        <Title actionButtons={<>
          <Button
            variant='contained'
            size='small'
            startIcon={<AddIcon />}
            onClick={() => setShowCreateMFADevice(true)}
            >{t('settings.mfa.add')}</Button>
          </>}>
          {t('settings.mfa.devices')}
        </Title>
        <Table
          columns={MFA_COLUMNS}
          items={mfaDevices}
          empty={<em>{t('settings.mfa.noDevices')}</em>}
          loading={isLoadingMFADevices}
          rowIdentifier='mfaDeviceId'
          />
      </TableContainer>

      <TableContainer component={Paper} className={classes.paper}>
        <Title actionButtons={<div style={{display: 'flex', alignItems: 'center'}}>
            <Typography variant='caption' className={classes.quotaIndicator}>
              {userProfile !== null && !isLoadingApiKeys && t('common.quotaIndicator', { cur: apiKeys.length, max: userProfile.userGroup.maxApiKeys})}
            </Typography>
            <ButtonGroup variant='contained' size='small'>
              <Button
                variant='contained'
                size='small'
                startIcon={<AddIcon />}
                onClick={() => setShowCreateApiKey(true)}
                disabled={userProfile === null || isLoadingApiKeys || apiKeys.length >= userProfile.userGroup.maxApiKeys}
                >{t('settings.apiKeys.add')}
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<DocsIcon />}
                href={Config.apiDocsURL}
                target='_blank'
                >{t('settings.apiKeys.showDocs')}
              </Button>
            </ButtonGroup>
          </div>}>
          {t('settings.apiKeys.keys')}
        </Title>
        <Table
          columns={APIKEY_COLUMNS}
          items={apiKeys}
          empty={<em>{t('settings.apiKeys.noKeys')}</em>}
          loading={isLoadingApiKeys}
          rowIdentifier='apiKeyId'
          />
      </TableContainer>

      <Paper className={classes.paper}>
        <Title>{t('settings.profile')}</Title>
        <Grid container className={classes.grid}>
          <Grid item sm={6} xs={12}>
            <ValidatingTextField
              label={t('settings.firstName')}
              InputLabelProps={{ shrink: true }}
              defaultValue={firstName}
              onBlur={({target}) => setFirstName(target.value)}
              pattern={RegexPatterns.name}
              patternErrorText={t('common.checkInput')}
              fullWidth
              />
          </Grid>
          <Grid item sm={6} xs={12}>
            <ValidatingTextField
              label={t('settings.lastName')}
              InputLabelProps={{ shrink: true }}
              defaultValue={lastName}
              onBlur={({target}) => setLastName(target.value)}
              pattern={RegexPatterns.name}
              patternErrorText={t('common.checkInput')}
              fullWidth
              />
          </Grid>
        </Grid>
      </Paper>

      <Paper className={classes.paper}>
        <Title>{t('settings.defaultTimezone')}</Title>
        <Grid container className={classes.grid}>
          <Grid item xs={12}>
            <InputLabel shrink id='timezone-label'>
              {t('jobs.timezone')}
            </InputLabel>
            <Select
              value={timezones.length ? timezone : ''}
              onChange={({target}) => setTimezone(target.value)}
              labelId='timezone-label'
              fullWidth>
              {timezones.map(zone =>
                <MenuItem value={zone} key={zone}>{zone}</MenuItem>)}
            </Select>
            <Typography variant='caption' component='div' className={classes.timezoneNote}>
              {t('settings.timezoneNote')}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Grid container direction='row' justify='flex-end'>
        <Grid item>
          <Button
            variant='contained'
            color='primary'
            startIcon={saving ? <CircularProgress size='small' /> : <SaveIcon />}
            className={classes.saveButton}
            onClick={() => saveSettings()}
            disabled={saving}>
            {t('common.save')}
          </Button>
        </Grid>
      </Grid>
    </>}

    {showChangePassword && <ChangePasswordDialog onClose={() => setShowChangePassword(false)} />}
    {showChangeEmail && <ChangeEmailAddressDialog currentEmailAddress={email} onClose={() => setShowChangeEmail(false)} />}
    {showDeleteAccount && <DeleteAccountDialog currentEmailAddress={email} onClose={() => setShowDeleteAccount(false)} />}
    {showSubscribeDialog && <SubscribeDialog onClose={() => setShowSubscribeDialog(false)} />}
    {showCreateMFADevice && <CreateMFADeviceDialog onClose={() => setShowCreateMFADevice(false)} onRefreshMFADevices={() => refreshMFADevices()} username={email} />}
    {deleteMFADevice!==null && <DeleteMFADeviceDialog mfaDevice={deleteMFADevice} onClose={() => setDeleteMFADevice(null)} onRefreshMFADevices={() => refreshMFADevices()} />}
    {showApiKey!==null && <ShowAPIKeyDialog apiKey={showApiKey} onClose={() => setShowApiKey(null)} />}
    {deleteApiKey!==null && <DeleteAPIKeyDialog apiKey={deleteApiKey} onClose={() => setDeleteApiKey(null)} onRefreshAPIKeys={() => refreshApiKeys()} />}
    {showCreateApiKey && <CreateAPIKeyDialog onClose={() => setShowCreateApiKey(false)} onRefreshAPIKeys={() => refreshApiKeys()} />}
    {editApiKey!==null && <EditAPIKeyDialog apiKey={editApiKey} onClose={() => setEditApiKey(null)} onRefreshAPIKeys={() => refreshApiKeys()} />}

  </div>;
}
