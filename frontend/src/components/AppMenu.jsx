import React from 'react';
import { List, ListItem, ListItemText, ListItemIcon, ListSubheader, Divider } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';

export default function AppMenu({ items, selectedId, onListItemClick = ()=>null }) {
  return <>
    {items.map((category, categoryNo) => <div key={categoryNo}>
      <Divider />
      <List>
        {category.text && <ListSubheader inset>{category.text}</ListSubheader>}
        {category.items.filter(item => !!item).map((item, itemNo) =>
          <ListItem key={itemNo} selected={item.id===selectedId} button component={RouterLink} to={item.href} onClick={onListItemClick}>
            <ListItemIcon title={item.text}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>)}
      </List>
    </div>)}
  </>;
}
