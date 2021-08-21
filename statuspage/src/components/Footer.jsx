import React from 'react';
import { Config } from '../utils/Config';
import { Box, Typography, Link } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return <Box mt={3} mb={3}>
    <Typography variant="body2" color="textSecondary" align="center">
      {t('common.poweredBy')} <Link color="inherit" href={Config.baseURL} target="_blank" rel="noopener">{Config.productName}</Link>
    </Typography>
  </Box>;
}
