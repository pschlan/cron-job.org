import React from 'react';
import { makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import { orange, red } from '@material-ui/core/colors';

const useStyles = makeStyles(theme => ({
  configIcon: {
    width: theme.spacing(2),
    display: 'inline-block',
    verticalAlign: 'middle'
  },
  orange: {
    color: orange[800],
  },
  red: {
    color: red[800],
  }
}));

export function StatusPageConfigIcon({ icon, color, ...props }) {
  const classes = useStyles();

  let colorClass = undefined;
  if (color === 'orange') {
    colorClass = classes.orange;
  } else if (color === 'red') {
    colorClass = classes.red;
  }

  return <icon.type
      className={clsx(classes.configIcon, colorClass)}
      {...props}
    />;
}
