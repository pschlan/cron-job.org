import React from 'react';
import { useSelector } from 'react-redux';
import { Switch, Route, Redirect, Link as RouterLink } from 'react-router-dom';
import Login from './Login';
import Container from '@material-ui/core/Container';
import { makeStyles, Box, Link } from '@material-ui/core';
import logo from '../../resources/logo.png';
import { Config } from '../../utils/Config';
import Footer from '../misc/Footer';
import SessionKeepalive from './SessionKeepalive';
import ConfirmEmailChange from './ConfirmEmailChange';
import LostPassword from './LostPassword';
import ResetPassword from './ResetPassword';
import Signup from './Signup';
import ConfirmAccount from './ConfirmAccount';

const useStyles = makeStyles(themes => ({
  paper: {
    marginTop: themes.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  logo: {
    width: '100%',
    marginBottom: themes.spacing(4)
  }
}));

export default function Authenticator({ children }) {
  const auth = useSelector(state => state.auth);
  const classes = useStyles();

  return <>
    {auth && auth.session ? <><SessionKeepalive />{children}</> : <>
      <Container component="main" maxWidth="xs">
        <div className={classes.paper}>
          <Link component={RouterLink} to='/'><img src={logo} alt={Config.productName} className={classes.logo} /></Link>
          <Switch>
            <Route path="/signup" component={Signup} />
            <Route path="/login" component={Login} />
            <Route path="/lostPassword" exact component={LostPassword} />
            <Route path="/confirmAccount/:token" exact component={ConfirmAccount} />
            <Route path="/confirmEmailChange/:token" exact component={ConfirmEmailChange} />
            <Route path="/resetPassword/:token" exact component={ResetPassword} />
            <Redirect to="/login" />
          </Switch>
        </div>
        <Box mt={8}>
          <Footer narrow={true} />
        </Box>
      </Container>
    </>}
  </>;
}
