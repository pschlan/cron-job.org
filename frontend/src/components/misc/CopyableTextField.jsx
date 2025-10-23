import React from 'react';

import { IconButton, InputAdornment, TextField } from '@material-ui/core';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

import CopyToClipboard from 'react-copy-to-clipboard';

import CopyIcon from '@material-ui/icons/FileCopy';

export default function CopyableTextField({ value, successMsg, errorMsg, InputProps = {}, ...props }) {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();

  return <TextField
    value={value}
    {...props}
    InputProps={{ ...InputProps, endAdornment: <>{InputProps.endAdornment}{value && <InputAdornment position='end'>
        <CopyToClipboard
          text={value}
          onCopy={(text, result) => enqueueSnackbar(result ? successMsg : errorMsg, { variant: result ? 'success' : 'error' })}
          >
          <IconButton size='small' title={t('common.copyToClipboard')}>
            <CopyIcon />
          </IconButton>
        </CopyToClipboard>
      </InputAdornment>}</>}}
    />;
};
