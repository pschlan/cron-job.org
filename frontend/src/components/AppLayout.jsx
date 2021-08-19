import React from 'react';
import clsx from 'clsx';
import { AppBar, Toolbar, IconButton, makeStyles, Drawer, Container, Box } from '@material-ui/core';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import MenuIcon from '@material-ui/icons/Menu';
import Footer from '../components/misc/Footer';
import { Config } from '../utils/Config';
import ProjectLogo from '../resources/logo-darkbg.png';
import { useDispatch, useSelector } from 'react-redux';
import { setUiSetting } from '../redux/actions';
import useViewport from '../hooks/useViewport';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  menuButton: {
    marginRight: theme.spacing(2)
  },
  title: {
    flexGrow: 1
  },
  toolbar: {
    paddingRight: 24
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  drawerPaper: {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: props => props.drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  drawerPaperClosed: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    width: () => theme.spacing(7)
  },
  drawerPaperClosedMobile: {
    display: 'block',
    width: () => 0
  },
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  appBarSpacer: theme.mixins.toolbar,
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  containerMobile: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1)
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: props => props.drawerWidth,
    width: props => `calc(100% - ${props.drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  projectLogo: {
    paddingTop: theme.spacing(1),
    height: '3rem'
  }
}));

export default function AppLayout({ children, toolbar, menu, menuText, drawerWidth=240 }) {
  const classes = useStyles({ drawerWidth });
  const dispatch = useDispatch();
  const { isMobile } = useViewport();

  const menuClosed = useSelector(state => state.ui && state.ui.menuClosed);
  const menuOpen = (menuClosed === false) || (!menuClosed && !isMobile);
  const setMenuOpen = val => dispatch(setUiSetting('menuClosed', !val));

  return (
    <div className={classes.root}>
      <AppBar position="absolute" className={clsx(classes.appBar, menuOpen && classes.appBarShift)} color='primary'>
        <Toolbar className={classes.toolbar}>
          <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label={menuText} onClick={() => setMenuOpen(true)}>
            <MenuIcon />
          </IconButton>
          <div className={classes.title}>
            <img src={ProjectLogo} className={classes.projectLogo} alt={Config.productName} title={Config.productName} />
          </div>
          {toolbar}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={menuOpen}
        classes={{paper: clsx(classes.drawerPaper, !menuOpen && classes.drawerPaperClosed, !menuOpen && isMobile && classes.drawerPaperClosedMobile)}}>
        <div className={classes.toolbarIcon}>
          <IconButton onClick={() => setMenuOpen(false)}>
            <ChevronLeftIcon />
          </IconButton>
        </div>
        {menu}
      </Drawer>

      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={clsx(classes.container, isMobile && classes.containerMobile)}>
          {children}
          <Box pt={4}>
            <Footer />
          </Box>
        </Container>
      </main>
    </div>
  );
}
