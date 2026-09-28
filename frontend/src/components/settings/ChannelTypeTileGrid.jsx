import React from 'react';
import { Box, makeStyles, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { WEBHOOK_PRESET_IDS } from '../../utils/WebhookPresets';
import { notificationChannelTypeIcon } from './NotificationChannelTypeIcon';

export const CHANNEL_TYPE_KIND_ORDER = [
  'email',
  ...WEBHOOK_PRESET_IDS,
  'webhook'
];

const useStyles = makeStyles(theme => ({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(1),
    [theme.breakpoints.up('sm')]: {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
    },
    [theme.breakpoints.up('md')]: {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
    }
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.75),
    minHeight: 72,
    padding: theme.spacing(1, 0.75),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    cursor: 'pointer',
    color: theme.palette.text.primary,
    font: 'inherit',
    textAlign: 'center',
    transition: theme.transitions.create(['border-color', 'background-color', 'color'], {
      duration: theme.transitions.duration.shorter
    }),
    '&:hover': {
      borderColor: theme.palette.text.secondary,
      backgroundColor: theme.palette.action.hover
    },
    '&:focus': {
      outline: 'none'
    },
    '&:focus-visible': {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`
    }
  },
  tileSelected: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.main + '14',
    color: theme.palette.primary.main,
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.main + '1f'
    }
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    color: 'inherit',
    '& > svg': {
      fontSize: 22
    }
  },
  label: {
    lineHeight: 1.2,
    fontSize: '0.75rem',
    fontWeight: 500
  }
}));

export default function ChannelTypeTileGrid({ value, onChange, kinds = CHANNEL_TYPE_KIND_ORDER }) {
  const classes = useStyles();
  const { t } = useTranslation();

  return (
    <Box className={classes.grid} role='radiogroup' aria-label={t('settings.notificationChannels.type')}>
      {kinds.map(kind => {
        const selected = value === kind;
        return (
          <button
            key={kind}
            type='button'
            role='radio'
            aria-checked={selected}
            className={`${classes.tile}${selected ? ` ${classes.tileSelected}` : ''}`}
            onClick={() => onChange(kind)}
          >
            <span className={classes.icon} aria-hidden='true'>
              {notificationChannelTypeIcon(kind)}
            </span>
            <Typography component='span' className={classes.label} noWrap>
              {t(`settings.notificationChannels.types.${kind}`)}
            </Typography>
          </button>
        );
      })}
    </Box>
  );
}
