import React, { useState } from 'react';
import { Box, Button, Grid, Link, makeStyles, Typography } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword as apiResetPassword } from '../../utils/API';
import ValidatingTextField from '../misc/ValidatingTextField';
import { RegexPatterns } from '../../utils/Constants';

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

export default function ResetPassword({ match }) {
  const token = match.params.token;

  const classes = useStyles();
  const { t } = useTranslation();
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState();

  function submit(event) {
    event.preventDefault();

    if (password1 !== password2 || !password1.length || !token) {
      return;
    }

    setIsLoading(true);
    setMessage();

    apiResetPassword(token, password1)
      .then(() => {
        setMessage({
          severity: 'success',
          text: t('login.passwordResetDone')
        });
      })
      .catch(() => {
        setMessage({
          severity: 'error',
          text: t('login.passwordResetFailed')
        });
      })
      .finally(() => setIsLoading(false));
  }

  return <>
    <Typography component="h1" variant="h5">
      {t('login.resetPassword')}
    </Typography>
    <Box mt={2}>
      {t('login.resetPasswordText')}
    </Box>
    <form noValidate className={classes.form} onSubmit={submit}>
      {message && <Alert severity={message.severity} className={classes.error}>
        {message.text}
      </Alert>}
      {(!message || message.severity!=='success') && <>
        <ValidatingTextField
          type="password"
          variant="outlined"
          margin="normal"
          required
          fullWidth
          label={t('settings.newPassword')}
          name="pw1"
          autoFocus
          onChange={event => setPassword1(event.target.value)}
          value={password1}
          pattern={RegexPatterns.password}
          patternErrorText={t('settings.invalidPassword')} />
        <ValidatingTextField
          type="password"
          variant="outlined"
          margin="normal"
          required
          fullWidth
          label={t('settings.repeatNewPassword')}
          name="pw2"
          onChange={event => setPassword2(event.target.value)}
          value={password2}
          pattern={RegexPatterns.password}
          patternErrorText={t('settings.invalidPassword')} />
        {(password1.length > 0 && password2.length > 0 && password1 !== password2) &&
          <Alert severity='error'>
            <AlertTitle>{t('common.error')}</AlertTitle>
            {t('settings.passwordsDontMatch')}
          </Alert>}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          disabled={isLoading || !password1.match(RegexPatterns.password) || password1 !== password2}>
          {t('login.resetPassword')}
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
