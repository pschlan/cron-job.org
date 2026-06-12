import React from 'react';
import { Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import LockIcon from '@material-ui/icons/Lock';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles(theme => ({
  root: {
    marginLeft: theme.spacing(0.5),
    display: 'inline-flex',
    verticalAlign: 'middle',
    alignItems: 'center'
  }
}));

export default function SslCertExpiryIcon({ sslCertExpiry, className }) {
  const classes = useStyles();
  const { t } = useTranslation();

  if (!sslCertExpiry || sslCertExpiry <= 0) {
    return null;
  }

  return (
    <Tooltip
      title={t('jobs.sslCertExpiry', { expiryDate: moment(sslCertExpiry * 1000).format('LL') })}
      arrow>
      <span className={className || classes.root}>
        <LockIcon fontSize='small' />
      </span>
    </Tooltip>
  );
}
