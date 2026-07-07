import React, { useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, CircularProgress, Grid, makeStyles, Paper } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { createBillingPortalSession, getSubscriptionLink, getUserProfile } from '../../utils/API';
import useUserProfile from '../../hooks/useUserProfile';
import Title from '../misc/Title';
import { useSnackbar } from 'notistack';
import { setUserProfile } from '../../redux/actions';
import { useDispatch } from 'react-redux';
import { SubscriptionStatus } from '../../utils/Constants';
import ManageSubscriptionIcon from '@material-ui/icons/CreditCard';
import SubscriptionActiveIcon from '@material-ui/icons/FavoriteBorder';
import SubscriptionInactiveIcon from '@material-ui/icons/PauseCircleOutline';
import LearnMoreIcon from '@material-ui/icons/Loyalty';
import IconAvatar from '../misc/IconAvatar';
import { Config } from '../../utils/Config';
import SubscribeDialog from './SubscribeDialog';
import moment from 'moment';

const useStyles = makeStyles(theme => ({
  paper: {
    '&:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  },
  grid: {
    '& .MuiGrid-item': {
      padding: theme.spacing(2)
    }
  }
}));

const REFRESH_INTERVAL = 2000;

export default function SettingsBilling() {
  const classes = useStyles();
  const { t } = useTranslation();
  const userProfile = useUserProfile();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [ isLoadingManageSubscription, setIsLoadingManageSubscription ] = useState(false);
  const [ showSubscribeDialog, setShowSubscribeDialog ] = useState(false);

  function manageSubscription() {
    setIsLoadingManageSubscription(true);

    if (userProfile.userSubscription.type === 'stripe') {
      createBillingPortalSession()
        .then(response => window.location.href = response.url)
        .catch(() => {
          enqueueSnackbar(t('settings.manageSubscriptionFailed'), { variant: 'error' });
          setIsLoadingManageSubscription(false);
        });
    } else if (userProfile.userSubscription.type === 'paddle') {
      const wnd = window.open('', '_blank');

      getSubscriptionLink('manage')
        .then(response => {
          if (wnd) {
            wnd.location.href = response.url;
          } else {
            window.location.href = response.url;
          }
        })
        .catch(() => {
          if (wnd) {
            wnd.close();
          }
          enqueueSnackbar(t('settings.manageSubscriptionFailed'), { variant: 'error' });
        })
        .finally(() => setIsLoadingManageSubscription(false));
    }
  }

  const isCancelledSubscription = userProfile && userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.CANCELLED;
  const isPaymentReturn = window && window.location && window.location.search === '?checkoutSuccess=true';

  useEffect(() => {
    function doRefreshProfile() {
      getUserProfile().then(response => dispatch(setUserProfile(response)));
    }

    if (isPaymentReturn && userProfile && (!userProfile.userSubscription || userProfile.userSubscription.status !== SubscriptionStatus.ACTIVE)) {
      const handle = window.setInterval(doRefreshProfile, REFRESH_INTERVAL);
      return () => window.clearInterval(handle);
    }
  }, [isPaymentReturn, userProfile, dispatch]);

  return <>
    <Paper className={classes.paper}>
      <Title>{t('settings.sustainingMembership')}</Title>

      {userProfile && <>
        <Grid container className={classes.grid} alignItems='center' justifyContent='center'>
          <Grid item sm={6} xs={12}>
            <Box display='flex' alignItems='center'>
              {((userProfile.userSubscription && userProfile.userSubscription.status !== SubscriptionStatus.INACTIVE) || isPaymentReturn) ? <>
                {(userProfile.userSubscription.status === SubscriptionStatus.PENDING || (isPaymentReturn && !userProfile.userSubscription)) && <>
                    <IconAvatar icon={SubscriptionActiveIcon} color='orange' />
                    <div>
                      {t('settings.subscriptionPending', { serviceName: Config.productName })}
                    </div>
                </>}
                {userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.ACTIVE && <>
                    <IconAvatar icon={SubscriptionActiveIcon} color='green' />
                    <div>
                      {t('settings.subscriptionActive', { serviceName: Config.productName })}
                    </div>
                  </>}
                {userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.EXPIRING && <>
                    <IconAvatar icon={SubscriptionInactiveIcon} color='orange' />
                    <div>
                      {t('settings.subscriptionExpiring', { serviceName: Config.productName, expiresAt: moment(userProfile.userSubscription.cancelAt * 1000).calendar() })}
                    </div>
                  </>}
                {userProfile.userSubscription && userProfile.userSubscription.status === SubscriptionStatus.CANCELLED && <>
                    <IconAvatar icon={SubscriptionInactiveIcon} />
                    <div>
                      {userProfile.userSubscription.isOnGracePeriod ?
                        <>{t('settings.subscriptionGracePeriod', { serviceName: Config.productName, expiresAt: moment(userProfile.userSubscription.gracePeriodEndsAt * 1000).calendar() })}</> :
                        <>{t('settings.subscriptionInactive', { serviceName: Config.productName })}</>}
                    </div>
                  </>}
              </> : <>
                {t('settings.sustainingMemberTeaser', { serviceName: Config.productName })}
              </>}
            </Box>
          </Grid>
          <Grid item sm={6} xs={12} align='right'>
            <ButtonGroup variant='contained' size='small'>
              {userProfile.userSubscription && userProfile.userSubscription.type==='stripe' && userProfile.userSubscription.status !== SubscriptionStatus.EXPIRING &&
                <Button
                  size='small'
                  variant='contained'
                  startIcon={isLoadingManageSubscription ? <CircularProgress size='small' /> : <ManageSubscriptionIcon />}
                  onClick={manageSubscription}
                  disabled={isLoadingManageSubscription}
                  float='right'
                  >
                  {t('settings.manageSubscription')}
                </Button>}
              {userProfile.userSubscription && userProfile.userSubscription.type==='paddle' &&
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={isLoadingManageSubscription ? <CircularProgress size='small' /> : <ManageSubscriptionIcon />}
                    onClick={manageSubscription}
                    disabled={isLoadingManageSubscription}
                    float='right'
                    >
                    {t('settings.manageSubscription')}
                  </Button>}
              {!isPaymentReturn && ((!userProfile.userSubscription) || (userProfile.userSubscription.status === SubscriptionStatus.CANCELLED)) &&
                <Button
                  size='small'
                  variant='contained'
                  startIcon={<LearnMoreIcon />}
                  onClick={() => setShowSubscribeDialog(true)}
                  float='right'
                  >
                  {t(isCancelledSubscription ? 'settings.becomeASustainingMember' : 'settings.learnMore')}
                </Button>}
            </ButtonGroup>
          </Grid>
        </Grid>
      </>}
    </Paper>

    {showSubscribeDialog && <SubscribeDialog onClose={() => setShowSubscribeDialog(false)} />}
  </>;
}
