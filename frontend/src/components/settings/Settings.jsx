import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup, CircularProgress, Grid, InputLabel, LinearProgress, makeStyles, MenuItem, Paper, Select, Typography } from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import { updateUserProfile } from '../../utils/API';
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
import { RegexPatterns } from '../../utils/Constants';
import DeleteAccountDialog from './DeleteAccountDialog';

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
  }
}));

export default function Settings() {
  const classes = useStyles();
  const { t } = useTranslation();
  const timezones = useTimezones();
  const userProfile = useUserProfile();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoading, setIsLoading ] = useState(true);
  const [ saving, setSaving ] = useState(false);
  const [ showChangePassword, setShowChangePassword ] = useState(false);
  const [ showChangeEmail, setShowChangeEmail ] = useState(false);
  const [ showDeleteAccount, setShowDeleteAccount ] = useState(false);

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

  </div>;
}
