import React from 'react';
import { useDispatch } from 'react-redux';
import { endSession } from '../redux/actions';
import { Button, Box, IconButton } from '@material-ui/core';
import { Config } from '../utils/Config';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@material-ui/icons/Language';
import LogoutIcon from '@material-ui/icons/ExitToApp';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import ExpandIcon from '@material-ui/icons/ExpandMore';
import ActionMenu from './misc/ActionMenu';
import useLanguageCode from '../hooks/useLanguageCode';
import useViewport from '../hooks/useViewport';

export default function AppToolbar() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const languageCode = useLanguageCode();
  const { isMobile } = useViewport();

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
      onClick={() => dispatch(endSession())}
      >
      <LogoutIcon />
    </IconButton>
  </> : <>
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
      onClick={() => dispatch(endSession())}
      startIcon={<LogoutIcon />}
      >
      {t('common.logout')}
    </Button>
  </>;
}
