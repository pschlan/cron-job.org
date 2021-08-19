import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { removeAlert } from '../../redux/actions';

export default function Alerts() {
  const alerts = useSelector(state => state.alerts);
  const dispatch = useDispatch();

  return (alerts || []).map(alert => 
    <Snackbar open={true} key={alert.id}>
      <Alert elevation={6} variant='filled' severity={alert.type} onClose={() => dispatch(removeAlert(alert.id))}>
        {alert.text}
      </Alert>
    </Snackbar>
  );
}
