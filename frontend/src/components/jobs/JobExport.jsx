import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Select, FormControl, InputLabel, MenuItem, Box, TextField, makeStyles } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { exportToCrontab } from '../../utils/JobExporter';

const useStyles = makeStyles(() => ({
  code: {
    fontFamily: '"Roboto Mono", courier',
    whiteSpace: 'pre-wrap'
  }
}));

const FORMATS = [
  {
    name: 'cronTabCurl',
    formatter: exportToCrontab
  }
];

export default function JobExport({ job, onClose }) {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose, []);

  const classes = useStyles();

  const [ format, setFormat ] = useState(FORMATS[0].name);

  return <Dialog open={true} onClose={() => onCloseRef.current()} maxWidth='md' fullWidth>
    <DialogTitle>
      {t('jobs.exportJob', { jobTitle: job.title || job.url })}
    </DialogTitle>
    <DialogContent>
      <FormControl fullWidth>
        <InputLabel id='format-select-label'>{t('jobs.exportFormat')}</InputLabel>
        <Select labelId='format-select-label' value={format} onChange={({target}) => setFormat(target.value)}>
          {FORMATS.map((format, id) => <MenuItem key={id} value={format.name}>{t(`jobs.format.${format.name}`)}</MenuItem>)}
        </Select>
      </FormControl>

      <Box mt={2}>
        <TextField
          label={t('jobs.exportData')}
          fullWidth
          multiline
          minRows={6}
          maxRows={6}
          InputProps={{
            readOnly: true,
            classes: {
              input: classes.code
            }
          }}
          variant='filled'
          value={FORMATS.find(x => x.name === format).formatter(job)}
          />
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => onCloseRef.current()}>
        {t('common.close')}
      </Button>
    </DialogActions>
  </Dialog>;
}
