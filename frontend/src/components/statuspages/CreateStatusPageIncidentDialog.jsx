import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField, makeStyles } from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { createStatusPageIncident } from '../../utils/API';
import moment from 'moment';

const useStyles = makeStyles(theme => ({
  createStatusPageIncidentDialog: {
    '& .MuiFormControl-root:not(:last-child)': {
      marginBottom: theme.spacing(2)
    }
  },
  descriptionField: {
    '& textarea': {
      padding: 'inherit',
      border: `1px solid ${grey[500]}`
    }
  }
}));

function datetimeLocalToUnix(value) {
  return moment(value, 'YYYY-MM-DDTHH:mm', true).unix();
}

export default function CreateStatusPageIncidentDialog({ statusPageId, onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ title, setTitle ] = useState('');
  const [ description, setDescription ] = useState('');
  const [ startDate, setStartDate ] = useState(moment().format('YYYY-MM-DDTHH:mm'));
  const [ status, setStatus ] = useState('ongoing');

  function doCreateIncident() {
    if (!title.match(RegexPatterns.title)) {
      return;
    }
    setIsLoading(true);
    createStatusPageIncident(statusPageId, title, description, datetimeLocalToUnix(startDate), status === 'ongoing' ? 1 : 0)
      .then(() => {
        enqueueSnackbar(t('statuspages.incidents.created'), { variant: 'success' });
        onCloseHook.current(true);
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.incidents.createFailed'), { variant: 'error' });
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={() => onCloseHook.current()} fullWidth maxWidth='sm'>
    <DialogTitle>{t('statuspages.incidents.create')}</DialogTitle>
    <DialogContent className={classes.createStatusPageIncidentDialog}>
      <FormControl fullWidth>
        <ValidatingTextField
          label={t('statuspages.title')}
          value={title}
          onChange={({target}) => setTitle(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.title}
          patternErrorText={t('common.checkInput')}
          fullWidth
          autoFocus
          required
          />
      </FormControl>

      <FormControl fullWidth>
        <TextField
          label={t('statuspages.incidents.description')}
          className={classes.descriptionField}
          value={description}
          onChange={({target}) => setDescription(target.value)}
          InputLabelProps={{ shrink: true }}
          multiline
          minRows={6}
          maxRows={6}
          fullWidth
          />
      </FormControl>

      <FormControl fullWidth>
        <TextField
          label={t('statuspages.incidents.startDate')}
          type='datetime-local'
          value={startDate}
          onChange={({target}) => setStartDate(target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          />
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id='incident-status-label' shrink>{t('statuspages.incidents.status')}</InputLabel>
        <Select
          labelId='incident-status-label'
          value={status}
          onChange={({target}) => setStatus(target.value)}
          fullWidth
          required>
          <MenuItem value='ongoing'>{t('statuspages.incidents.ongoing')}</MenuItem>
          <MenuItem value='resolved'>{t('statuspages.incidents.resolved')}</MenuItem>
        </Select>
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={() => onCloseHook.current()} disabled={isLoading}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => doCreateIncident()} disabled={
        isLoading ||
        title.length < 3 ||
        !startDate}>
          {t('statuspages.incidents.create')}
      </Button>
    </DialogActions>
  </Dialog>;
}
