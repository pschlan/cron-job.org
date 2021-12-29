import React, { useRef, useState } from 'react';
import { TextField, Button, Grid, Link, makeStyles, Typography, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, DialogContentText, Box } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login, resendActivationEmail } from '../../utils/API';
import { useDispatch } from 'react-redux';
import { setAuthToken } from '../../redux/actions';
import CheckIcon from '@material-ui/icons/Check';
import ErrorIcon from '@material-ui/icons/Close';

const useStyles = makeStyles(themes => ({
  form: {
    width: '100%',
    marginTop: themes.spacing(1)
  },
  submit: {
    margin: themes.spacing(1, 0, 2)
  },
  error: {
    margin: themes.spacing(2, 0)
  }
}));

function MFADialog({ onCancel, onLogin }) {
  const onCancelHook = useRef(onCancel, []);
  const onLoginHook = useRef(onLogin, []);

  const [mfaCode, setMFACode] = useState('');
  const { t } = useTranslation();

  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      if (mfaCode.length >= 6) {
        onLoginHook.current(mfaCode);
      }
    }
  }

  return <Dialog open={true} fullWidth maxWidth='sm' onClose={onCancelHook.current}>
    <DialogTitle>{t('login.mfaTitle')}</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {t('login.mfaText')}
      </DialogContentText>
      <FormControl fullWidth>
        <TextField
          value={mfaCode}
          onChange={({target}) => setMFACode(target.value)}
          label={t('login.mfaCode')}
          InputLabelProps={{ shrink: true }}
          inputRef={input => input && input.focus()}
          inputProps={{onKeyPress: handleKeyPress, autocomplete: 'one-time-code'}}
          />
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCancelHook.current}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => onLoginHook.current(mfaCode)} disabled={mfaCode.length<6}>
        {t('login.login')}
      </Button>
    </DialogActions>
  </Dialog>;
}

const RESEND_HIDDEN = 0;
const RESEND_SHOW = 1;
const RESEND_PROCESSING = 2;
const RESEND_SUCCESS = 3;
const RESEND_FAILED = 4;

export default function Login() {
  const classes = useStyles();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState();
  const [resendState, setResendState] = useState(RESEND_HIDDEN);
  const [resendTo, setResendTo] = useState();
  const [resendPassword, setResendPassword] = useState();
  const [showMFADialog, setShowMFADialog] = useState(false);
  const passwordField = useRef();
  const dispatch = useDispatch();

  function doLogin(event, mfaCode = '') {
    if (event) {
      event.preventDefault();
    }

    setIsLoading(true);
    setErrorMessage();
    setResendState(RESEND_HIDDEN);

    login(email, password, rememberMe, mfaCode)
      .then(response => dispatch(setAuthToken(response.token)))
      .catch(error => {
        if (error.response && error.response.status === 403) {
          setShowMFADialog(true);
        } else {
          if (error.response && error.response.status === 410) {
            setErrorMessage(t('login.bannedError'));
          } else if (error.response && error.response.status === 423) {
            setErrorMessage(t('login.notActivatedError'));
            setResendTo(email);
            setResendPassword(password);
            setResendState(RESEND_SHOW);
          } else {
            setErrorMessage(t('login.loginFailed'));
          }
          setPassword('');
        }
      })
      .finally(() => setIsLoading(false));
  }

  function mfaCancel() {
    setPassword('');
    setShowMFADialog(false);
  }

  function mfaConfirm(code) {
    setShowMFADialog(false);
    doLogin(null, code);
  }

  function doResendActivationMail() {
    setResendState(RESEND_PROCESSING);
    resendActivationEmail(resendTo, resendPassword)
      .then(() => {
        setResendState(RESEND_SUCCESS);
      })
      .catch(() => {
        setResendState(RESEND_FAILED);
      });
  }

  return <>
    <Typography component="h1" variant="h5">
      {t('login.login')}
    </Typography>
    <form noValidate className={classes.form} onSubmit={doLogin}>
      {errorMessage && <Alert severity="error" className={classes.error}>
        {errorMessage}
        {[RESEND_SHOW, RESEND_PROCESSING, RESEND_SUCCESS, RESEND_FAILED].includes(resendState) && <Box mt={1}>
          <Button
            variant='outlined'
            size='small'
            onClick={() => doResendActivationMail()}
            disabled={resendState !== RESEND_SHOW}
            >
            {resendState === RESEND_SUCCESS && <>
              <CheckIcon />
              {t('login.resendSuccess')}
            </>}
            {resendState === RESEND_FAILED && <>
              <ErrorIcon />
              {t('login.resendFailed')}
            </>}
            {[RESEND_SHOW, RESEND_PROCESSING].includes(resendState) && <>
              {t('login.resendActivationMail')}
            </>}
          </Button>
        </Box>}
      </Alert>}
      <TextField
        variant="outlined"
        margin="normal"
        required
        fullWidth
        label={t('login.emailAddress')}
        name="email"
        autoComplete="email"
        autoFocus={true}
        onChange={event => setEmail(event.target.value)}
        value={email}
        error={!!errorMessage} />
      <TextField
        variant="outlined"
        margin="normal"
        required
        fullWidth
        label={t('login.password')}
        name="password"
        type="password"
        autoComplete="current-password"
        onChange={event => setPassword(event.target.value)}
        value={password}
        error={!!errorMessage}
        ref={passwordField} />
      <FormControlLabel
        control={<Checkbox value="remember" color="primary" />}
        onChange={({target}) => setRememberMe(target.checked)}
        label={t('login.rememberme')} />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        className={classes.submit}
        disabled={isLoading}>
        {t('login.login')}
      </Button>
      <Grid container>
        <Grid item xs>
          <Link to="/lostPassword" variant="body2" component={RouterLink}>
            {t('login.forgotPassword')}
          </Link>
        </Grid>
        <Grid item>
          <Link to="/signup" variant="body2" component={RouterLink}>
            {t('login.signupLink')}
          </Link>
        </Grid>
      </Grid>
    </form>
    {showMFADialog && <MFADialog
      onCancel={() => mfaCancel()}
      onLogin={mfaCode => mfaConfirm(mfaCode)}
      />}
  </>;
}
