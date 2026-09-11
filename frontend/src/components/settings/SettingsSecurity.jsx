import React, { useEffect, useState } from 'react';
import { Button, makeStyles, TableContainer, Typography, Paper } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { getMFADevices } from '../../utils/API';
import useUserProfile from '../../hooks/useUserProfile';
import Title from '../misc/Title';
import CreateMFADeviceDialog from './CreateMFADeviceDialog';
import DeleteMFADeviceDialog from './DeleteMFADeviceDialog';
import TOTPDeviceIcon from '@material-ui/icons/PhoneIphone';
import YubicoOTPDeviceIcon from '@material-ui/icons/VpnKey';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import IconAvatar from '../misc/IconAvatar';
import Table from '../misc/Table';

const useStyles = makeStyles(theme => ({
  actionButton: {
    margin: theme.spacing(0.5)
  }
}));

export default function SettingsSecurity() {
  const classes = useStyles();
  const { t } = useTranslation();
  const userProfile = useUserProfile();

  const [ isLoadingMFADevices, setIsLoadingMFADevices ] = useState(true);
  const [ mfaDevices, setMFADevices ] = useState([]);
  const [ showCreateMFADevice, setShowCreateMFADevice ] = useState(false);
  const [ deleteMFADevice, setDeleteMFADevice ] = useState(null);

  function refreshMFADevices() {
    setIsLoadingMFADevices(true);
    getMFADevices()
      .then(response => setMFADevices(response.mfaDevices))
      .finally(() => setIsLoadingMFADevices(false));
  }

  useEffect(() => {
    refreshMFADevices();
  }, []);

  const MFA_COLUMNS = [
    {
      head: t('settings.mfa.title'),
      cell: mfaDevice => <div style={{display: 'flex', alignItems: 'center'}}>
          <IconAvatar icon={mfaDevice.type===0 ? <TOTPDeviceIcon /> : mfaDevice.type===1 ? <YubicoOTPDeviceIcon /> : <></>} color={mfaDevice.enabled ? 'green' : 'default'} />
          <div>
            <div>{mfaDevice.title}</div>
            <div><Typography variant="caption">
              {mfaDevice.type===0 && <>{t('settings.mfa.totpDevice.title')}</>}
              {mfaDevice.type===1 && <>{t('settings.mfa.yubicoOtpDevice.title')}</>}
            </Typography></div>
          </div>
        </div>
    },
    {
      head: t('common.actions'),
      cell: mfaDevice => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setDeleteMFADevice(mfaDevice)}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  return <>
    <TableContainer component={Paper}>
      <Title actionButtons={<>
        <Button
          variant='contained'
          size='small'
          startIcon={<AddIcon />}
          onClick={() => setShowCreateMFADevice(true)}
          disabled={!userProfile || !userProfile.userProfile}
          >{t('settings.mfa.add')}</Button>
        </>}>
        {t('settings.mfa.devices')}
      </Title>
      <Table
        columns={MFA_COLUMNS}
        items={mfaDevices}
        empty={<em>{t('settings.mfa.noDevices')}</em>}
        loading={isLoadingMFADevices}
        rowIdentifier='mfaDeviceId'
        />
    </TableContainer>

    {showCreateMFADevice && <CreateMFADeviceDialog onClose={() => setShowCreateMFADevice(false)} onRefreshMFADevices={() => refreshMFADevices()} username={userProfile && userProfile.userProfile ? userProfile.userProfile.email : ''} />}
    {deleteMFADevice!==null && <DeleteMFADeviceDialog mfaDevice={deleteMFADevice} onClose={() => setDeleteMFADevice(null)} onRefreshMFADevices={() => refreshMFADevices()} />}
  </>;
}
