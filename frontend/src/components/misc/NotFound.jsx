import React from 'react';
import { Paper, Typography, makeStyles, Button } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import BackIcon from '@material-ui/icons/ArrowBack';
import { useHistory } from 'react-router-dom';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(3)
  },
  backIcon: {
    width: theme.spacing(2),
    height: theme.spacing(2),
    marginRight: theme.spacing(1)
  },
  paragraph: {
    margin: theme.spacing(2, 0)
  }
}));

export default function NotFound() {
  const classes = useStyles();
  const { t } = useTranslation();
  const history = useHistory();

  return <Paper className={classes.paper}>
    <Typography component="h1" variant="h5">{t('common.notfound')}</Typography>
    <Typography className={classes.paragraph}>
      {t('common.notfoundMessage')}
    </Typography>
    <Button
      variant="contained"
      size="small"
      onClick={() => history.goBack()}
      >
      <BackIcon className={classes.backIcon} />
      {t('common.back')}
    </Button>
  </Paper>;
}
