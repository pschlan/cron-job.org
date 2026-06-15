import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField, makeStyles } from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { updateStatusPageIncident } from '../../utils/API';
import moment from 'moment';

function datetimeLocalToUnix(value) {
  return moment(value, 'YYYY-MM-DDTHH:mm', true).unix();
}

function unixToDatetimeLocal(unix) {
  return moment.unix(unix).format('YYYY-MM-DDTHH:mm');
}

const useStyles = makeStyles(theme => ({
  editStatusPageIncidentDialog: {
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

export default function EditStatusPageIncidentDialog({ incident, onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ title, setTitle ] = useState(incident.title);
  const [ description, setDescription ] = useState(incident.description);
  const [ startDate, setStartDate ] = useState(unixToDatetimeLocal(incident.startDate));
  const [ status, setStatus ] = useState(incident.status === 1 ? 'ongoing' : 'resolved');

  function doSaveIncident() {
    if (!title.match(RegexPatterns.title)) {
      return;
    }
    setIsLoading(true);
    updateStatusPageIncident(incident.incidentId, {
        title,
        description,
        startDate: datetimeLocalToUnix(startDate),
        status: status === 'ongoing' ? 1 : 0
      })
      .then(() => {
        enqueueSnackbar(t('statuspages.incidents.updated'), { variant: 'success' });
        onCloseHook.current(true);
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.incidents.updateFailed'), { variant: 'error' });
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={() => onCloseHook.current()} fullWidth maxWidth='sm'>
    <DialogTitle>{t('statuspages.incidents.edit', { title: incident.title })}</DialogTitle>
    <DialogContent className={classes.editStatusPageIncidentDialog}>
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
          required
          />
      </FormControl>

      <FormControl fullWidth>
        <TextField
          label={t('statuspages.incidents.description')}
          className={classes.descriptionField}
          defaultValue={description}
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
          defaultValue={startDate}
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
      <Button color='primary' onClick={() => doSaveIncident()} disabled={
        isLoading ||
        title.length < 3 ||
        !startDate}>
          {t('common.save')}
      </Button>
    </DialogActions>
  </Dialog>;
}
