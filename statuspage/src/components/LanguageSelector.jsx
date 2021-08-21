import React, { useState, useCallback } from 'react';
import { MenuItem, Menu, ListItemIcon, ListItemText, makeStyles, IconButton } from '@material-ui/core';
import LanguageIcon from '@material-ui/icons/Language';
import CheckedIcon from '@material-ui/icons/RadioButtonChecked';
import UncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import { Config } from '../utils/Config';
import useLanguageCode from '../hooks/useLanguageCode';
import { useTranslation } from 'react-i18next';

const useStyles = makeStyles(theme => ({
  icon: {
    minWidth: 0,
    marginRight: theme.spacing(1)
  }
}));

export default function LanguageSelector() {
  const classes = useStyles();

  const languageCode = useLanguageCode();
  const { i18n } = useTranslation();

  const [ anchorEl, setAnchorEl ] = useState(null);

  const onClickItemHook = useCallback(lang => {
    i18n.changeLanguage(lang);
  }, [i18n]);

  return <>
    <IconButton
      aria-haspopup='true'
      onClick={({currentTarget}) => setAnchorEl(currentTarget)}
      size='medium'
      >
      <LanguageIcon fontSize='inherit' />
    </IconButton>
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      onClose={() => setAnchorEl(null)}
      keepMounted
      >
      {Object.keys(Config.languages).map(lang => <MenuItem key={lang} onClick={() => { onClickItemHook(lang); setAnchorEl(null); }}>
        <ListItemIcon className={classes.icon}>
          {languageCode===lang ? <CheckedIcon fontSize='small' /> : <UncheckedIcon fontSize='small' />}
        </ListItemIcon>
        <ListItemText>{Config.languages[lang]}</ListItemText>
      </MenuItem>)}
    </Menu>
  </>;
}