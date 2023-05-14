import React from 'react';
import { List, ListItem, ListItemText, ListItemIcon, ListSubheader, Divider, makeStyles, Typography } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';

const useStyles = makeStyles((theme) => ({
  nested: {
    paddingLeft: theme.spacing(4)
  }
}));

function showSubItems(item, selectedId) {
  if (!item.subItems) {
    return false;
  }

  if (item.id === selectedId) {
    return true;
  }

  if (item.subItems.filter(x => x.id === selectedId).length > 0) {
    return true;
  }

  return false;
}

export default function AppMenu({ items, selectedId, indentSubItems, onListItemClick = ()=>null }) {
  const classes = useStyles();

  return <>
    {items.map((category, categoryNo) => <div key={categoryNo}>
      <Divider />
      <List>
        {category.text && <ListSubheader inset>{category.text}</ListSubheader>}
        {category.items.filter(item => !!item).map((item, itemNo) =>
          <>
            <ListItem key={itemNo} selected={item.id===selectedId} button component={RouterLink} to={item.href} onClick={onListItemClick}>
              <ListItemIcon title={item.text}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
            {showSubItems(item, selectedId) && <List disablePadding>
              {item.subItems.map((subItem, subItemNo) => <ListItem className={indentSubItems && classes.nested} key={subItemNo} selected={subItem.id===selectedId} button component={RouterLink} to={subItem.href} onClick={onListItemClick}>
                  <ListItemIcon title={subItem.text}>
                    {subItem.icon}
                  </ListItemIcon>
                  <ListItemText primary={<Typography noWrap>{subItem.text}</Typography>} />
                </ListItem>)}
            </List>}
          </>)}
      </List>
    </div>)}
  </>;
}
