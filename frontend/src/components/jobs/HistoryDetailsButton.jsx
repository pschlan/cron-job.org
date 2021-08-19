import React, { useState } from 'react';
import { Button, makeStyles } from '@material-ui/core';
import DetailsIcon from '@material-ui/icons/MoreVert';
import { useTranslation } from 'react-i18next';
import HistoryDetails from './HistoryDetails';

const useStyles = makeStyles((theme) => ({
  actionButton: {
    margin: theme.spacing(1)
  }
}));

export default function HistoryDetailsButton({ log }) {
  const classes = useStyles();
  const { t } = useTranslation();
  const [ isOpen, setIsOpen ] = useState(false);

  return <>
    <Button
      variant="outlined"
      size="small"
      startIcon={<DetailsIcon />}
      className={classes.actionButton}
      onClick={() => setIsOpen(true)}
      >
      {t('common.details')}
    </Button>
    {isOpen && <HistoryDetails log={log} open={isOpen} onClose={() => setIsOpen(false)} />}
  </>;
}
