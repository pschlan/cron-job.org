import React, { useRef } from 'react';

import ActionMenu from './ActionMenu';
import { IconButton } from '@material-ui/core';
import insertTextAtCursor from 'insert-text-at-cursor';
import { useTranslation } from 'react-i18next';

import { Config } from '../../utils/Config';

import VariableIcon from '@material-ui/icons/Code';
import HelpIcon from '@material-ui/icons/HelpOutline';

function getTextField(elem) {
  while (elem) {
    elem = elem.parentNode;
    if (!elem) {
      break;
    }
    const textField = elem.querySelector('input[type=text]');
    if (textField) {
      return textField;
    }
  }
  return null;
}

export default function VariableMenu() {
  const { t } = useTranslation();
  const buttonRef = useRef();

  const insertVariable = text => {
    const textField = getTextField(buttonRef.current);
    if (textField != null) {
      insertTextAtCursor(textField, text);
      window.setTimeout(() => textField.focus(), 100);
    }
  };

  return <ActionMenu
    variant='contained'
    size='small'
    component={<IconButton />}
    buttonRef={buttonRef}
    items={[
      {
        icon: <VariableIcon />,
        text: '%cjo:unixtime%'
      },
      {
        icon: <VariableIcon />,
        text: '%cjo:uuid4%'
      },
      {
        divider: true
      },
      {
        icon: <HelpIcon />,
        text: t('common.help'),
        onClick: () => window.open(Config.variablesDocsURL)
      }
    ]}
    onClickItem={item => item.onClick ? item.onClick() : insertVariable(item.text)}
    text={<VariableIcon />}
  />;
}
