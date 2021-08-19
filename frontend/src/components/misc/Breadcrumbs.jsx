import React from 'react';
import { Breadcrumbs as MaterialBreadcrumbs, makeStyles, Link } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';

const useStyles = makeStyles((theme) => ({
  breadcrumbs: {
    marginBottom: theme.spacing(2)
  }
}));

export default function Breadcrumbs({ items }) {
  const classes = useStyles();

  return <MaterialBreadcrumbs aria-label="breadcrumb" className={classes.breadcrumbs}>
    {items.filter(item => !!item).map((item, itemNo) =>
      <Link key={itemNo} color="inherit" to={item.href} component={RouterLink}>{item.text}</Link>)}
  </MaterialBreadcrumbs>;
};
