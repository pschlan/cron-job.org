import React from 'react';
import { Box, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  code: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    height: theme.spacing(20),
    overflowY: 'scroll',
    fontFamily: '"Roboto Mono", courier',
    whiteSpace: 'pre-wrap'
  }
}));

export default function Code({ children, height = null }) {
  const classes = useStyles();
  return <Box className={classes.code} style={{height}} border={1} borderColor="grey.500">
    {children}
  </Box>;
}
