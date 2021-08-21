import React from 'react';
import { makeStyles, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  title: {
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  }
}));

export default function Title({ children }) {
  const classes = useStyles();

  return <Typography component="div" variant="h6" color="primary" className={classes.title}>
    {children}
  </Typography>;
}
