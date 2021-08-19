import React, { useState } from 'react';
import { TextField, Button, Grid, Link, makeStyles, Typography, Box } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recoverPassword } from '../../utils/API';

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

export default function LostPassword() {
  const classes = useStyles();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState();

  function submit(event) {
    event.preventDefault();

    setIsLoading(true);
    setMessage();

    recoverPassword(email)
      .then(() => {
        setMessage({
          severity: 'success',
          text: t('login.lostPasswordDone')
        });
      })
      .catch(() => {
        setMessage({
          severity: 'error',
          text: t('login.lostPasswordFailed')
        });
      })
      .finally(() => setIsLoading(false));
  }

  return <>
    <Typography component="h1" variant="h5">
      {t('login.forgotPassword')}
    </Typography>
    <Box mt={2}>
      {t('login.forgotPasswordText')}
    </Box>
    <form noValidate className={classes.form} onSubmit={submit}>
      {message && <Alert severity={message.severity} className={classes.error}>
        {message.text}
      </Alert>}
      {(!message || message.severity!=='success') && <>
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
          error={message && message.severity==='error'} />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          disabled={isLoading || !email.length}>
          {t('login.recoverPassword')}
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
