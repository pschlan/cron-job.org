import React, { useEffect, useState, useRef } from 'react';
import { makeStyles, Tab, Tabs } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles(theme => ({
  div: {
  },
  tabs: {
    '& .MuiTab-root': {
      minWidth: 'auto'
    },
    '& .MuiTabs-flexContainer': {
      justifyContent: 'left'
    }
  }
}));

export default function TimespanSelector({ onChange = (value) => null }) {
  const classes = useStyles();
  const { t } = useTranslation();

  const onChangeHook = useRef(onChange, []);
  const [value, setValue] = useState('1day');

  useEffect(() => {
    onChangeHook.current(value);
  }, [onChangeHook, value]);

  return <div className={classes.div}>
    <Tabs value={value} onChange={(event, newValue) => setValue(newValue)} className={classes.tabs}>
      <Tab value='1year' label={t('timespan.1year')} />
      <Tab value='6months' label={t('timespan.6months')} />
      <Tab value='1month' label={t('timespan.1month')} />
      <Tab value='1week' label={t('timespan.1week')} />
      <Tab value='1day' label={t('timespan.1day')} />
    </Tabs>
  </div>;
}