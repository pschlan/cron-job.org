import React, { useRef, useState } from 'react';
import { CircularProgress, Paper, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, makeStyles, TableCell, TableHead, Table, TableRow, MenuItem, TableBody, Select, Box, Grid } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Config } from '../../utils/Config';
import YesIcon from '@material-ui/icons/Check';
import NoIcon from '@material-ui/icons/Close';
import { red, green } from '@material-ui/core/colors';
import SubscribeIcon from '@material-ui/icons/ShoppingCart';
import useUserProfile from '../../hooks/useUserProfile';

const useStyles = makeStyles(theme => ({
  no: {
    color: red[800]
  },
  yes: {
    color: green[800]
  }
}));

const States = {
  'TEASER': 0,
  'SUBSCRIBE': 1
};

export default function SubscribeDialog({ onClose }) {
  const classes = useStyles();

  const onCloseHook = useRef(onClose, []);
  const { t } = useTranslation();

  const [ state, setState ] = useState(States.TEASER);
  const [ isLoadingOrder, setIsLoadingOrder ] = useState(false);
  const [ productId, setProductId ] = useState('sustain10');

  const userProfile = useUserProfile();

  function startOrder() {
    setIsLoadingOrder(true);

    window.location.href =
      Config.sustainingMembership.paddle.paymentUrl(t('landingLocale'))
        + '#userId=' + userProfile.userId
        + '&email=' + encodeURIComponent(userProfile.userProfile.email)
        + '&product=' + productId
        + '&locale=' + t('paddleLocale');
  }

  return <Dialog open={true} onClose={onCloseHook.current} fullWidth maxWidth='md'>
    <DialogTitle>{t('settings.sustainingMembership')}</DialogTitle>
    <DialogContent>
      {state === States.TEASER && <>
        <DialogContentText>
          {t('settings.subscribeDialog.text1', { serviceName: Config.productName })}<br /><br />
          {t('settings.subscribeDialog.text2')}<br /><br />
          {t('settings.subscribeDialog.text3')}
        </DialogContentText>
        <Paper>
          <Box p={2}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>{t('settings.subscribeDialog.defaultMembership')}</TableCell>
                  <TableCell>{t('settings.subscribeDialog.sustainingMembership')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.supportService', { serviceName: Config.productName })}</TableCell>
                  <TableCell><NoIcon fontSize='small' className={classes.no} /></TableCell>
                  <TableCell><YesIcon fontSize='small'  className={classes.yes} /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.maxJobTimeout')}</TableCell>
                  <TableCell>30 {t('units.long.s')}</TableCell>
                  <TableCell>5 {t('units.long.min')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.maxRequestSize')}</TableCell>
                  <TableCell>8 KB</TableCell>
                  <TableCell>64 KB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.maxFailures')}</TableCell>
                  <TableCell>15</TableCell>
                  <TableCell>150</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.maxStatusPages')}</TableCell>
                  <TableCell>5 / 10</TableCell>
                  <TableCell>15 / 20</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.maxApiCallsPerDay')}</TableCell>
                  <TableCell>100</TableCell>
                  <TableCell>5000</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('settings.subscribeDialog.price')}</TableCell>
                  <TableCell>{t('settings.subscribeDialog.free')}</TableCell>
                  <TableCell style={{whiteSpace: 'pre-line'}}>{t('settings.subscribeDialog.subscriptionPrices')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box display='flex' alignItems='center' justifyContent='center' mt={2}>
              <Box mr={2}>
                {t('settings.subscribeDialog.ready')}
              </Box>
              <Box>
                <Button
                  variant='contained'
                  color='primary'
                  startIcon={<SubscribeIcon />}
                  onClick={() => setState(States.SUBSCRIBE)}
                  >
                  {t('settings.subscribeDialog.subscribeNow')}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </>}
      {state === States.SUBSCRIBE && <>
        <DialogContentText>
          {t('settings.subscribeDialog.orderText')}
        </DialogContentText>
        <Paper>
          <Box p={2}>
            <Grid container xs={12} md={12}>
              <Grid item xs={12}>
                <Box display='flex' alignItems='center' mt={2}>
                  <Box mr={2}>
                    <Select
                      value={productId}
                      onChange={({target}) => setProductId(target.value)}
                      labelID='product-id-label'>
                      {Config.sustainingMembership.amountsAMonth.map(amount =>
                      <MenuItem value={'sustain'+amount} key={amount}>{t('settings.subscribeDialog.amountAMonth', { amount })}</MenuItem>)}
                      {Config.sustainingMembership.amountsAYear.map(amount =>
                      <MenuItem value={'sustainyear'+amount} key={amount}>{t('settings.subscribeDialog.amountAYear', { amount })}</MenuItem>)}
                    </Select>
                  </Box>
                  <Box>
                    <Button
                      variant='contained'
                      color='primary'
                      startIcon={isLoadingOrder ? <CircularProgress size='small' /> : <SubscribeIcon />}
                      onClick={() => startOrder()}
                      disabled={isLoadingOrder || !userProfile || !userProfile.userId}>
                      {t('settings.subscribeDialog.orderNow')}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </>}
      <p><small>{t('settings.subscribeDialog.vatNote')}</small></p>
    </DialogContent>
    <DialogActions>
      <Button autoFocus onClick={onCloseHook.current}>
        {t(state === States.TEASER ? 'common.close' : 'common.abort')}
      </Button>
    </DialogActions>
  </Dialog>;
}