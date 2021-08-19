import React from 'react';
import { makeStyles, Paper, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  numberPanel: {
    padding: theme.spacing(2),
    textAlign: 'center'
  }
}));

export default function NumberPanel({ number, error = false, label }) {
  const classes = useStyles();

  return <Paper className={classes.numberPanel}>
    <Typography variant='h4' color={error ? 'error' : undefined}>{number}</Typography>
    <Typography variant='caption'>{label}</Typography>
  </Paper>;
}
