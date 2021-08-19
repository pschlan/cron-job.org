import React from 'react';
import { Typography, Box, makeStyles } from '@material-ui/core';
import useViewport from '../../hooks/useViewport';

const useStyles = makeStyles(theme => ({
  titleBox: {
    minWidth: '0px'
  }
}));

export default function Heading({ children, actionButtons }) {
  const classes = useStyles();
  const { isMobile } = useViewport();

  const heading = <Typography style={{display:'block'}} component="h1" variant="h4" color="primary" noWrap>
    {children}
  </Typography>;

  return isMobile ? <>
      <Box>{heading}</Box>
      {actionButtons && <Box mt={2} mb={4}>{actionButtons}</Box>}
    </> : <Box display='flex' mb={2} alignItems='center'>
    <Box pr={1} flexGrow={1} className={classes.titleBox}>
      {heading}
    </Box>
    {actionButtons && <Box pl={1}>
      {actionButtons}
    </Box>}
  </Box>;
}
