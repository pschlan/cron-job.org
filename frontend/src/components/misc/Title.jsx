import React from 'react';
import { Box, makeStyles, Typography } from '@material-ui/core';
import useViewport from '../../hooks/useViewport';

const useStyles = makeStyles(theme => ({
  box: {
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  }
}));

export default function Title({ children, actionButtons }) {
  const classes = useStyles();
  const { isMobile } = useViewport();

  const heading = <Typography style={{display:'block'}} component="div" variant="h6" color="primary" className={classes.title} noWrap>
    {children}
  </Typography>;

  return isMobile ? <Box className={classes.box}>
    <Box>{heading}</Box>
    {actionButtons && <Box mt={1} mb={1}>{actionButtons}</Box>}
  </Box> : <Box display='flex' alignItems='center' className={classes.box}>
    <Box pr={1} flexGrow={1}>
      {heading}
    </Box>
    {actionButtons && <Box pl={1}>
      {actionButtons}
    </Box>}
  </Box>;
}
