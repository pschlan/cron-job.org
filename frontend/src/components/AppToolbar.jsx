import React from 'react';
import { useDispatch } from 'react-redux';
import { Button, Box, IconButton, Tooltip } from '@material-ui/core';
import { Config } from '../utils/Config';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@material-ui/icons/Language';
import LogoutIcon from '@material-ui/icons/ExitToApp';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import ExpandIcon from '@material-ui/icons/ExpandMore';
import SustainingMemberIcon from '@material-ui/icons/FavoriteBorder';
import ActionMenu from './misc/ActionMenu';
import useLanguageCode from '../hooks/useLanguageCode';
import useViewport from '../hooks/useViewport';
import { logOut } from '../utils/Utils';
import useUserProfile from '../hooks/useUserProfile';
import { SubscriptionStatus } from '../utils/Constants';
import { useHistory } from 'react-router';

export default function AppToolbar() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const languageCode = useLanguageCode();
  const { isMobile } = useViewport();
  const userProfile = useUserProfile();
  const history = useHistory();

  return isMobile ? <>
    <ActionMenu
      color='inherit'
      text={<LanguageIcon />}
      items={Object.keys(Config.languages).map(lang => ({
          icon: languageCode===lang ? <CheckedIcon fontSize='small' /> : <UncheckedIcon fontSize='small' />,
          text: Config.languages[lang],
          lang
        }))}
      onClickItem={item => i18n.changeLanguage(item.lang)}
      component={<IconButton />}
      />
    <IconButton
      color='inherit'
      onClick={() => logOut(dispatch)}
      >
      <LogoutIcon />
    </IconButton>
  </> : <>
    {userProfile && userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.ACTIVE && <Tooltip title={t('common.sustainingMemberThanks')}>
      <IconButton
        color='inherit'
        onClick={() => history.push('/settings')}
        >
        <SustainingMemberIcon />
      </IconButton>
    </Tooltip>}
    <Box mr={2}>
      <ActionMenu
        color='inherit'
        text={Config.languages[languageCode]}
        startIcon={<LanguageIcon />}
        endIcon={<ExpandIcon />}
        items={Object.keys(Config.languages).map(lang => ({
            icon: languageCode===lang ? <CheckedIcon fontSize='small' /> : <UncheckedIcon fontSize='small' />,
            text: Config.languages[lang],
            lang
          }))}
        onClickItem={item => i18n.changeLanguage(item.lang)}
        />
    </Box>
    <Button
      color='inherit'
      onClick={() => logOut(dispatch)}
      startIcon={<LogoutIcon />}
      >
      {t('common.logout')}
    </Button>
  </>;
}
