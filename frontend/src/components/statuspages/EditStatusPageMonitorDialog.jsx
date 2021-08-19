import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, InputAdornment, Switch, Slider, Typography, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { updateStatusPageMonitor } from '../../utils/API';
import LatencyIcon from '@material-ui/icons/Timer';
import UptimeIcon from '@material-ui/icons/Timeline';
import { StatusPageConfigIcon } from './StatusPageConfigIcon';
import { formatPercentile } from '../../utils/Units';

function percentValidator(value) {
  const normalizedValue = ('' + value).replace(',', '.');
  if (!normalizedValue.match(RegexPatterns.float)) {
    return false;
  }
  const floatValue = parseFloat(normalizedValue);
  if (isNaN(floatValue)) {
    return false;
  }
  return (floatValue >= 0 && floatValue <= 100);
}

function msValidator(value) {
  const normalizedValue = '' + value;
  if (!normalizedValue.match(RegexPatterns.integer)) {
    return false;
  }
  const intValue = parseInt(normalizedValue);
  if (isNaN(intValue)) {
    return false;
  }
  return (intValue >= 0 && intValue <= 30*1000);
}

function getFloat(value) {
  return parseFloat(('' + value).replace(',', '.'));
}

export default function EditStatusPageMonitorDialog({ monitor, onClose }) {
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ title, setTitle ] = useState(monitor.monitorTitle);
  const [ monitorEnabled, setMonitorEnabled ] = useState(monitor.enabled);
  const [ thresholdUptimeWarning, setThresholdUptimeWarning ] = useState(monitor.thresholdUptimeWarning * 100.0);
  const [ thresholdUptimeError, setThresholdUptimeError ] = useState(monitor.thresholdUptimeError * 100.0);
  const [ thresholdLatencyWarning, setThresholdLatencyWarning ] = useState(monitor.thresholdLatencyWarning);
  const [ thresholdLatencyError, setThresholdLatencyError ] = useState(monitor.thresholdLatencyError);
  const [ percentile, setPercentile ] = useState(monitor.percentile);

  function doSaveMonitor() {
    if (!title.match(RegexPatterns.title)) {
      return;
    }
    setIsLoading(true);
    updateStatusPageMonitor(monitor.monitorId, {
        monitorTitle: title,
        enabled: monitorEnabled,
        thresholdUptimeWarning: getFloat(thresholdUptimeWarning) / 100.0,
        thresholdUptimeError: getFloat(thresholdUptimeError) / 100.0,
        thresholdLatencyWarning: getFloat(thresholdLatencyWarning),
        thresholdLatencyError: getFloat(thresholdLatencyError),
        percentile
      })
      .then(() => {
        enqueueSnackbar(t('statuspages.monitorUpdated'), { variant: 'success' });
        onCloseHook.current(true);
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.monitorUpdateFailed'), { variant: 'error' });
      })
      .finally(() => setIsLoading(false));
  }

  const PERCENTILE_MARKS = [
    {
      value: 0.50,
      label: 'p50'
    },
    {
      value: 0.90,
      label: 'p90'
    },
    {
      value: 0.95,
      label: 'p95'
    },
    {
      value: 0.99,
      label: 'p99'
    }
  ]

  return <Dialog open={true} onClose={() => onCloseHook.current()} fullWidth maxWidth='sm'>
    <DialogTitle>{t('statuspages.editMonitor', { title: monitor.monitorTitle })}</DialogTitle>
    <DialogContent>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <ValidatingTextField
              label={t('statuspages.title')}
              defaultValue={title}
              onChange={({target}) => setTitle(target.value)}
              InputLabelProps={{ shrink: true }}
              pattern={RegexPatterns.title}
              patternErrorText={t('common.checkInput')}
              fullWidth
              autoFocus
              />
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <ValidatingTextField
            label={t('statuspages.thresholdUptimeWarning')}
            defaultValue={thresholdUptimeWarning}
            onChange={({target}) => setThresholdUptimeWarning(target.value)}
            InputLabelProps={{shrink: true}}
            InputProps={{
              startAdornment: <InputAdornment position='start'>
                  <StatusPageConfigIcon icon={UptimeIcon} color='orange' />
                </InputAdornment>
            }}
            patternErrorText={t('statuspages.checkUptimeThresholdInput')}
            validator={percentValidator}
            fullWidth
            />
        </Grid>
        <Grid item xs={6}>
          <ValidatingTextField
            label={t('statuspages.thresholdUptimeError')}
            defaultValue={thresholdUptimeError}
            onChange={({target}) => setThresholdUptimeError(target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <InputAdornment position='start'>
                  <StatusPageConfigIcon icon={UptimeIcon} color='red' />
                </InputAdornment>
            }}
            patternErrorText={t('statuspages.checkUptimeThresholdInput')}
            validator={percentValidator}
            fullWidth
            />
        </Grid>
        <Grid item xs={6}>
          <ValidatingTextField
            label={t('statuspages.thresholdLatencyWarning')}
            defaultValue={thresholdLatencyWarning}
            onChange={({target}) => setThresholdLatencyWarning(target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <InputAdornment position='start'>
                  <StatusPageConfigIcon icon={LatencyIcon} color='orange' />
                </InputAdornment>
            }}
            patternErrorText={t('statuspages.checkLatencyThresholdInput')}
            validator={msValidator}
            fullWidth
            />
        </Grid>
        <Grid item xs={6}>
          <ValidatingTextField
            label={t('statuspages.thresholdLatencyError')}
            defaultValue={thresholdLatencyError}
            onChange={({target}) => setThresholdLatencyError(target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <InputAdornment position='start'>
                  <StatusPageConfigIcon icon={LatencyIcon} color='red' />
                </InputAdornment>
            }}
            patternErrorText={t('statuspages.checkLatencyThresholdInput')}
            validator={msValidator}
            fullWidth
            />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <Typography variant='caption' color='textSecondary'>{t('statuspages.percentile')}</Typography>
            <Box pl={1.5} pr={1.5}>
              <Slider
                value={percentile}
                marks={PERCENTILE_MARKS}
                min={0.5}
                max={0.99}
                step={null}
                valueLabelDisplay='auto'
                valueLabelFormat={formatPercentile}
                onChange={(event, value) => setPercentile(value)}
                />
            </Box>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch
              checked={monitorEnabled}
              onChange={({target}) => setMonitorEnabled(target.checked)}
              />}
            label={t('statuspages.enableMonitor')}
            />
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={() => onCloseHook.current()} disabled={isLoading}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => doSaveMonitor()} disabled={
        isLoading ||
        title.length<3 ||
        !msValidator(thresholdLatencyError) || !msValidator(thresholdLatencyWarning) ||
        !percentValidator(thresholdUptimeError || !percentValidator(thresholdUptimeWarning))}>
          {t('common.save')}
      </Button>
    </DialogActions>
  </Dialog>;
}