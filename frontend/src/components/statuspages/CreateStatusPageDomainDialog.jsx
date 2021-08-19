import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,  makeStyles, InputAdornment } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import ValidatingTextField from '../misc/ValidatingTextField';
import { useSnackbar } from 'notistack';
import { RegexPatterns } from '../../utils/Constants';
import { createStatusPageDomain } from '../../utils/API';
import { Alert, AlertTitle } from '@material-ui/lab';
import DomainIcon from '@material-ui/icons/DnsOutlined';
import { grey } from '@material-ui/core/colors';
import { Config } from '../../utils/Config';

const useStyles = makeStyles(theme => ({
  createStatusPageDomainDialog: {
    '& div:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  },
  https: {
    color: theme.palette.text.disabled,
    marginRight: theme.spacing(-0.5)
  },
  dnsRecord: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1),
    fontFamily: 'courier',
    backgroundColor: grey[100]
  },
}));

export default function CreateStatusPageDomain({ statusPageId, onClose }) {
  const classes = useStyles();
  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoading, setIsLoading ] = useState(false);
  const [ domain, setDomain ] = useState('');

  function doCreateDomain() {
    if (!domain.match(RegexPatterns.domain)) {
      return;
    }
    setIsLoading(true);
    createStatusPageDomain(statusPageId, domain)
      .then(() => {
        enqueueSnackbar(t('statuspages.domainCreated'), { variant: 'success' });
        onCloseHook.current(true);
      })
      .catch(error => {
        if (error.response && error.response.status === 409) {
          enqueueSnackbar(t('statuspages.domainCreateFailedConflict'), { variant: 'error' });
        } else {
          enqueueSnackbar(t('statuspages.domainCreateFailed'), { variant: 'error' });
        }
      })
      .finally(() => setIsLoading(false));
  }

  return <Dialog open={true} onClose={() => onCloseHook.current()} fullWidth maxWidth='sm'>
    <DialogTitle>{t('statuspages.addDomain')}</DialogTitle>
    <DialogContent className={classes.createStatusPageDomainDialog}>
      <div>
        {t('statuspages.addDomainText')}
      </div>

      <FormControl fullWidth>
        <ValidatingTextField
          label={t('statuspages.domain')}
          value={domain}
          onChange={({target}) => setDomain(target.value)}
          InputLabelProps={{ shrink: true }}
          pattern={RegexPatterns.domain}
          patternErrorText={t('common.checkInput')}
          InputProps={{
            startAdornment: <InputAdornment position='start'>
                <DomainIcon />
                <span className={classes.https}>https://</span>
              </InputAdornment>
          }}
          fullWidth
          autoFocus
          />
      </FormControl>

      <Alert severity='info'>
        <AlertTitle>{t('common.note')}</AlertTitle>
        {t('statuspages.customDomainHelp', { cnameDomain: Config.statusPageDomain })}
        <div className={classes.dnsRecord}>{domain.match(RegexPatterns.domain) ? `${domain}.` : t('statuspages.domainPlaceholder')} IN CNAME {Config.statusPageDomain}.</div>
      </Alert>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={() => onCloseHook.current()} disabled={isLoading}>
        {t('common.cancel')}
      </Button>
      <Button color='primary' onClick={() => doCreateDomain()} disabled={
        isLoading ||
        !domain.match(RegexPatterns.domain)}>
          {t('statuspages.addDomain')}
      </Button>
    </DialogActions>
  </Dialog>;
}