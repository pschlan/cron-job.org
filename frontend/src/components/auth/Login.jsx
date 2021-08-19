import React, { useRef, useState } from 'react';
import { TextField, Button, Grid, Link, makeStyles, Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../../utils/API';
import { useDispatch } from 'react-redux';
import { setAuthToken } from '../../redux/actions';

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

export default function Login() {
  const classes = useStyles();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState();
  const passwordField = useRef();
  const dispatch = useDispatch();

  function doLogin(event) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage();

    login(email, password)
      .then(response => dispatch(setAuthToken(response.token)))
      .catch(error => {
        if (error.response && error.response.status === 410) {
          setErrorMessage(t('login.bannedError'));
        } else if (error.response && error.response.status === 403) {
          setErrorMessage(t('login.notActivatedError'));
        } else {
          setErrorMessage(t('login.loginFailed'));
        }
        setPassword('');
      })
      .finally(() => setIsLoading(false));
  }

  return <>
    <Typography component="h1" variant="h5">
      {t('login.login')}
    </Typography>
    <form noValidate className={classes.form} onSubmit={doLogin}>
      {errorMessage && <Alert severity="error" className={classes.error}>
        {errorMessage}
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
      {/*<FormControlLabel
        control={<Checkbox value="remember" color="primary" />}
        label={t('login.rememberme')} />*/}
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
  </>;
}
