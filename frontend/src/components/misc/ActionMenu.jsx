import React, { useState } from 'react';
import { Divider, MenuItem, Menu, Button, ListItemIcon, ListItemText, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  icon: {
    minWidth: 0,
    marginRight: theme.spacing(1)
  }
}));

export default function ActionMenu({ items, variant, color, text, size, component = <Button />, onClickItem = (item) => null, ...props }) {
  const classes = useStyles();

  const [ anchorEl, setAnchorEl ] = useState(null);

  return <>
    <component.type
      variant={variant}
      color={color}
      aria-haspopup='true'
      onClick={({currentTarget}) => setAnchorEl(currentTarget)}
      size={size}
      {...props}
      >
      {text}
    </component.type>
    <Menu
      anchorEl={anchorEl}
      open={!!anchorEl}
      onClose={() => setAnchorEl(null)}
      keepMounted
      >
      {items.map((item, index) =>
          item.divider ? <Divider key={index} /> :
            <MenuItem key={index} onClick={() => { onClickItem(item); setAnchorEl(null); }}>
              {item.icon && <ListItemIcon className={classes.icon}>{item.icon}</ListItemIcon>}
              <ListItemText>{item.text}</ListItemText>
            </MenuItem>)}
    </Menu>
  </>;
}