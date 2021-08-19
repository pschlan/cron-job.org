import React from 'react';
import { makeStyles, Avatar } from '@material-ui/core';
import { green, orange, blue } from '@material-ui/core/colors';
import clsx from 'clsx';

const useIconStyles = makeStyles((theme) => ({
  orange: {
    color: theme.palette.getContrastText(orange[800]),
    backgroundColor: orange[800]
  },
  green: {
    color: theme.palette.getContrastText(green[800]),
    backgroundColor: green[800]
  },
  blue: {
    color: theme.palette.getContrastText(blue[800]),
    backgroundColor: blue[800]
  },
  avatar: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    marginRight: theme.spacing(2)
  },
  icon: {
    width: theme.spacing(2),
    height: theme.spacing(2)
  }
}));

export default function IconAvatar({ color, icon }) {
  const classes = useIconStyles();

  return <Avatar
      className={clsx(classes.avatar, color === 'orange' && classes.orange, color === 'green' && classes.green, color === 'blue' && classes.blue)}
    >
      <icon.type className={classes.icon} />
    </Avatar>;
}
