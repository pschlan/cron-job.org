import React from 'react';
import { Box, ButtonBase, makeStyles } from '@material-ui/core';
import { WEBHOOK_PAYLOAD_VARIABLES } from '../../utils/Constants';

const useStyles = makeStyles(theme => ({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1)
  },
  chip: {
    padding: theme.spacing(0.25, 0.75),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.secondary,
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    lineHeight: 1.6,
    transition: theme.transitions.create(['border-color', 'color', 'background-color'], {
      duration: theme.transitions.duration.shorter
    }),
    '&:hover': {
      borderColor: theme.palette.text.secondary,
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.action.selected
    }
  }
}));

function placeholder(name) {
  return '${' + name + '}';
}

export default function WebhookVariableChips({ onInsert }) {
  const classes = useStyles();

  return (
    <Box className={classes.row}>
      {WEBHOOK_PAYLOAD_VARIABLES.map(name => (
        <ButtonBase
          key={name}
          type='button'
          className={classes.chip}
          onMouseDown={event => event.preventDefault()}
          onClick={() => onInsert(name)}
        >
          {placeholder(name)}
        </ButtonBase>
      ))}
    </Box>
  );
}
