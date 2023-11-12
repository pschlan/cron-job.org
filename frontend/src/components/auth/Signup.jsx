import React, { useRef, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Grid, Link, makeStyles, Typography } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createAccount } from '../../utils/API';
import ValidatingTextField from '../misc/ValidatingTextField';
import { RegexPatterns } from '../../utils/Constants';
import ReCAPTCHA from 'react-google-recaptcha';
import { Config } from '../../utils/Config';
import moment from 'moment-timezone';

const useStyles = makeStyles(themes => ({
  form: {
    width: '100%',
    marginTop: themes.spacing(1)
  },
  submit: {
    margin: themes.spacing(3, 0, 2)
  },
  error: {
    margin: themes.spacing(2, 0)
  }
}));

export default function Signup() {
  const classes = useStyles();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [acceptToS, setAcceptToS] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState();
  const recaptchaRef = useRef();

  function submit(event) {
    event.preventDefault();

    if (password1 !== password2
        || !password1.match(RegexPatterns.password)
        || !email.match(RegexPatterns.email)
        || !acceptToS
        || !acceptPrivacy) {
      return;
    }

    setIsLoading(true);
    setMessage();

    const doCreateAccount = token => {
      return createAccount(token, firstName, lastName, email, password1, moment.tz.guess())
        .then(() => {
          setMessage({
            severity: 'success',
            text: t('signup.signupSuccess')
          });
        })
        .catch(error => {
          if (error.response && error.response.status === 409) {
            setMessage({
              severity: 'error',
              text: t('signup.signupConflict')
            });
          } else {
            setMessage({
              severity: 'error',
              text: t('signup.signupError')
            });
          }
        });
    };

    if (Config.recaptchaSiteKey !== null) {
      recaptchaRef.current.executeAsync()
        .then(doCreateAccount)
        .catch(() => {
          setMessage({
            severity: 'error',
            text: t('signup.recaptchaError')
          });
        })
        .finally(() => {
          if (recaptchaRef.current && (!message || message.severity !== 'success')) {
            recaptchaRef.current.reset();
          }
          setIsLoading(false);
        });
    } else {
      doCreateAccount(null)
        .finally(() => {
          setIsLoading(false);
        });
    }
  }

  return <>
    <Typography component="h1" variant="h5">
      {t('signup.signup')}
    </Typography>
    <Box mt={2}>
      {t('signup.signupText')}
    </Box>
    <form noValidate className={classes.form} onSubmit={submit}>
      {message && <Alert severity={message.severity} className={classes.error}>
        {message.text}
      </Alert>}
      {(!message || message.severity!=='success') && <>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <ValidatingTextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              label={t('settings.firstName')}
              name="firstName"
              autoComplete="given-name"
              autoFocus
              onChange={event => setFirstName(event.target.value)}
              value={firstName}
              pattern={RegexPatterns.name}
              patternErrorText={t('common.checkInput')} />
          </Grid>
          <Grid item xs={6}>
            <ValidatingTextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              label={t('settings.lastName')}
              name="lastName"
              autoComplete="family-name"
              onChange={event => setLastName(event.target.value)}
              value={lastName}
              pattern={RegexPatterns.name}
              patternErrorText={t('common.checkInput')} />
              </Grid>
        </Grid>
        <ValidatingTextField
          variant="outlined"
          margin="normal"
          autoComplete="email"
          required
          fullWidth
          label={t('settings.email')}
          name="email"
          onChange={event => setEmail(event.target.value)}
          value={email}
          pattern={RegexPatterns.email}
          patternErrorText={t('common.checkInput')} />
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <ValidatingTextField
              type="password"
              variant="outlined"
              margin="normal"
              autoComplete="new-password"
              required
              fullWidth
              label={t('login.password')}
              name="pw1"
              onChange={event => setPassword1(event.target.value)}
              value={password1}
              pattern={RegexPatterns.password}
              patternErrorText={t('settings.invalidPassword')} />
          </Grid>
          <Grid item xs={6}>
            <ValidatingTextField
              type="password"
              variant="outlined"
              margin="normal"
              autoComplete="new-password"
              required
              fullWidth
              label={t('signup.repeatPassword')}
              name="pw2"
              onChange={event => setPassword2(event.target.value)}
              value={password2}
              pattern={RegexPatterns.password}
              patternErrorText={t('settings.invalidPassword')} />
          </Grid>
        </Grid>
        {Config.recaptchaSiteKey !== null && <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={Config.recaptchaSiteKey}
          size='invisible'
          />}
        {(password1.length > 0 && password2.length > 0 && password1 !== password2) &&
          <Alert severity='error'>
            <AlertTitle>{t('common.error')}</AlertTitle>
            {t('signup.passwordsDontMatch')}
          </Alert>}
        <FormControlLabel
          control={<Checkbox />}
          label={<Link href={Config.termsOfServiceURL} target="_blank" rel="noopener nofollow">{t('signup.acceptToS')}</Link>}
          onChange={({target}) => setAcceptToS(target.checked)}
          checked={acceptToS}
          required
          />
        <FormControlLabel
          control={<Checkbox />}
          label={<Link href={Config.privacyPolicyURL} target="_blank" rel="noopener nofollow">{t('signup.acceptPrivacy')}</Link>}
          onChange={({target}) => setAcceptPrivacy(target.checked)}
          checked={acceptPrivacy}
          required
          />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          disabled={isLoading || !firstName.length || !lastName.length || !email.match(RegexPatterns.email) || !password1.match(RegexPatterns.password) || password1 !== password2 || !acceptToS || !acceptPrivacy}>
          {t('signup.createAccount')}
        </Button>
      </>}
      <Grid container>
        <Grid item xs>
          <Link to="/login" variant="body2" component={RouterLink}>
            &laquo; {t('login.login')}
          </Link>
        </Grid>
      </Grid>
    </form>
  </>;
}
