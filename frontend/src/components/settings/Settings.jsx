import React, { useState } from 'react';
import { Button, ButtonGroup, Tab, Tabs } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../../hooks/useUserProfile';
import Breadcrumbs from '../misc/Breadcrumbs';
import Heading from '../misc/Heading';
import EmailIcon from '@material-ui/icons/Email';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import PasswordIcon from '@material-ui/icons/LockOpen';
import ChangePasswordDialog from './ChangePasswordDialog';
import ChangeEmailAddressDialog from './ChangeEmailAddressDialog';
import DeleteAccountDialog from './DeleteAccountDialog';
import { Config } from '../../utils/Config';
import SettingsProfile from './SettingsProfile';
import SettingsSecurity from './SettingsSecurity';
import SettingsApiKeys from './SettingsApiKeys';
import SettingsBilling from './SettingsBilling';

export default function Settings() {
  const { t } = useTranslation();
  const userProfile = useUserProfile();

  const [ tabValue, setTabValue ] = useState('profile');

  const [ showChangePassword, setShowChangePassword ] = useState(false);
  const [ showChangeEmail, setShowChangeEmail ] = useState(false);
  const [ showDeleteAccount, setShowDeleteAccount ] = useState(false);

  const email = (userProfile && userProfile.userProfile) ? userProfile.userProfile.email : '';

  return <div>
    <Breadcrumbs items={[
        {
          href: '/settings',
          text: t('common.settings')
        }
      ]} />
    <Heading actionButtons={<ButtonGroup variant='contained' size='small'>
        <Button
          startIcon={<EmailIcon />}
          onClick={() => setShowChangeEmail(true)}
          >{t('settings.changeEmail')}</Button>
        <Button
          startIcon={<PasswordIcon />}
          onClick={() => setShowChangePassword(true)}
          >{t('settings.changePassword')}</Button>
        <Button
          startIcon={<DeleteForeverIcon />}
          onClick={() => setShowDeleteAccount(true)}
          >{t('settings.deleteAccount')}</Button>
      </ButtonGroup>}>
      {t('common.settings')}
    </Heading>

    <Tabs
      value={tabValue}
      onChange={(e, val) => setTabValue(val)}
      indicatorColor="primary"
      textColor="primary">
      <Tab label={t('settings.tabs.profile')} value='profile' />
      <Tab label={t('settings.tabs.security')} value='security' />
      <Tab label={t('settings.tabs.apiKeys')} value='apiKeys' />
      {Config.sustainingMembership.enable && <Tab label={t('settings.tabs.billing')} value='billing' />}
    </Tabs>

    {tabValue === 'profile' && <SettingsProfile />}
    {tabValue === 'security' && <SettingsSecurity />}
    {tabValue === 'apiKeys' && <SettingsApiKeys />}
    {Config.sustainingMembership.enable && tabValue === 'billing' && <SettingsBilling />}

    {showChangePassword && <ChangePasswordDialog onClose={() => setShowChangePassword(false)} />}
    {showChangeEmail && <ChangeEmailAddressDialog currentEmailAddress={email} onClose={() => setShowChangeEmail(false)} />}
    {showDeleteAccount && <DeleteAccountDialog currentEmailAddress={email} onClose={() => setShowDeleteAccount(false)} />}
  </div>;
}
