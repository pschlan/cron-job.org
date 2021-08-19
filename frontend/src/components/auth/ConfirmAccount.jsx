import React, { useEffect, useState } from 'react';
import { CircularProgress, Grid, Link, makeStyles, Typography } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { confirmAccount as apiConfirmAccount } from '../../utils/API';

const useStyles = makeStyles(themes => ({
  alert: {
    margin: themes.spacing(2, 0)
  }
}));

export default function ConfirmAccount({ match }) {
  const token = match.params.token;
  const [ successful, setSuccessful ] = useState(null);
  const { t } = useTranslation();
  const classes = useStyles();

  useEffect(() => {
    apiConfirmAccount(token)
      .then(() => {
        setSuccessful(true);
      })
      .catch(() => {
        setSuccessful(false);
      });
  }, [token]);

  return  <>
    <Typography component="h1" variant="h5">
      {t('signup.signup')}
    </Typography>
    {successful === null ? <CircularProgress /> : <Alert severity={successful ? 'success' : 'error'} className={classes.alert}>
      <AlertTitle>{t(successful ? 'common.success' : 'common.error')}</AlertTitle>
      {t(successful ? 'signup.confirmSuccess' : 'signup.confirmError')}
    </Alert>}
    <Grid container>
      <Grid item xs>
        <Link to="/login" variant="body2" component={RouterLink}>
          &laquo; {t('login.login')}
        </Link>
      </Grid>
    </Grid>
  </>;
}
