import { CircularProgress } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmUserEmailChange } from '../../utils/API';

export default function ConfirmEmailChange({ match }) {
  const token = match.params.token;
  const [ successful, setSuccessful ] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    confirmUserEmailChange(token)
      .then(() => {
        setSuccessful(true);
      })
      .catch(() => {
        setSuccessful(false);
      });
  }, [token]);

  return <>
    {successful === null ? <CircularProgress /> : <Alert severity={successful ? 'success' : 'error'}>
      <AlertTitle>{t(successful ? 'common.success' : 'common.error')}</AlertTitle>
      {t(successful ? 'confirmEmailChange.success' : 'confirmEmailChange.error')}
    </Alert>}
  </>;
}
