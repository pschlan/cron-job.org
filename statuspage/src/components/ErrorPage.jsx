import React from 'react';
import { useTranslation } from 'react-i18next';
import SadIcon from '@material-ui/icons/SentimentVeryDissatisfied';
import { makeStyles, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  error: {
    marginTop: theme.spacing(16),
    textAlign: 'center'
  },
  icon: {
    fontSize: theme.spacing(32),
    marginBottom: theme.spacing(4)
  },
  text: {
    marginTop: theme.spacing(2)
  }
}));

export default function ErrorPage({ error }) {
  const classes = useStyles();
  const { t } = useTranslation();

  const errorCode = error && error.response && error.response.status === 404
    ? '404'
    : 'other';

  return <div className={classes.error}>
    <SadIcon className={classes.icon} />
    <Typography variant='h3'>{t(`error.${errorCode}.title`)}</Typography>
    <div className={classes.text}>
      {t(`error.${errorCode}.text`)}
    </div>
  </div>;
}
