import { Box, Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, CircularProgress, InputLabel, LinearProgress, Link, makeStyles, Paper, TableContainer, Tooltip, Typography, Switch, FormControlLabel } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStatusPage, deleteStatusPage, deleteStatusPageMonitor, updateStatusPage, deleteStatusPageDomain, updateStatusPageMonitorsOrder } from '../../utils/API';
import { RegexPatterns } from '../../utils/Constants';
import { formatMs, formatPercent, formatPercentile } from '../../utils/Units';
import Breadcrumbs from '../misc/Breadcrumbs';
import Heading from '../misc/Heading';
import IconAvatar from '../misc/IconAvatar';
import NotFound from '../misc/NotFound';
import Table from '../misc/Table';
import Title from '../misc/Title';
import ValidatingTextField from '../misc/ValidatingTextField';
import MonitorIcon from '@material-ui/icons/DesktopWindows';
import MonitorDisabledIcon from '@material-ui/icons/DesktopAccessDisabled';
import LatencyIcon from '@material-ui/icons/Timer';
import UptimeIcon from '@material-ui/icons/Timeline';
import EditIcon from '@material-ui/icons/Edit';
import AddIcon from '@material-ui/icons/AlarmAdd';
import OpenIcon from '@material-ui/icons/FolderOpen';
import DeleteIcon from '@material-ui/icons/Delete';
import DomainIcon from '@material-ui/icons/DnsOutlined';
import SaveIcon from '@material-ui/icons/Save';
import ExpandIcon from '@material-ui/icons/ExpandMore';
import ActionsIcon from '@material-ui/icons/MoreVert';
import EditStatusPageMonitorDialog from './EditStatusPageMonitorDialog';
import { StatusPageConfigIcon } from './StatusPageConfigIcon';
import { useSnackbar } from 'notistack';
import CreateStatusPageMonitorDialog from './CreateStatusPageMonitorDialog';
import CreateStatusPageDomainDialog from './CreateStatusPageDomainDialog';
import { Config } from '../../utils/Config';
import ActionMenu from '../misc/ActionMenu';
import { useHistory } from 'react-router-dom';

const useStyles = makeStyles(theme => ({
  grid: {
    '& .MuiGrid-item': {
      padding: theme.spacing(2)
    }
  },
  paper: {
    '&:not(:last-of-type)': {
      marginBottom: theme.spacing(2)
    }
  },
  config: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  configThresholds: {
    '& > div > span': {
      marginRight: theme.spacing(1),
      display: 'inline-block',
      minWidth: '5em'
    },
    '& > div > .MuiSvgIcon-root': {
      marginRight: theme.spacing(0.5)
    },
    borderRight: `1px solid ${theme.palette.divider}`
  },
  configPercentile: {
    paddingLeft: theme.spacing(1)
  },
  actionButton: {
    margin: theme.spacing(1)
  },
  quotaIndicator: {
    marginRight: theme.spacing(2)
  },
  logo: {
    maxHeight: theme.spacing(6),
    maxWidth: theme.spacing(48)
  },
  domainsPaper: {
    marginBottom: theme.spacing(2)
  }
}));

function parseLogoDataUrl(url) {
  const noLogo = { logo: '', logoMimeType: '' };
  if (!url) {
    return noLogo;
  }

  const match = url.match(/^data:([a-z0-9/]+);base64,(.+)$/);
  if (!match) {
    return noLogo;
  }

  return { logo: match[2], logoMimeType: match[1] };
}

export default function StatusPageEditor({ match }) {
  const { t } = useTranslation();
  const classes = useStyles();
  const { enqueueSnackbar } = useSnackbar();
  const history = useHistory();

  const statusPageId = parseInt(match.params.statusPageId);
  const [ isLoading, setIsLoading ] = useState(true);
  const [ statusPage, setStatusPage ] = useState();
  const [ monitors, setMonitors ] = useState([]);
  const [ domains, setDomains ] = useState([]);

  const [ isSaving, setIsSaving ] = useState(false);

  const [ showDeleteStatusPage, setShowDeleteStatusPage ] = useState(false);

  const [ statusPageTitle, setStatusPageTitle ] = useState();
  const [ logoDataUrl, setLogoDataUrl ] = useState(null);
  const [ published, setPublished ] = useState(false);

  const [ editMonitor, setEditMonitor ] = useState(null);
  const [ deleteMonitor, setDeleteMonitor ] = useState(null);
  const [ showCreateMonitor, setShowCreateMonitor ] = useState(false);

  const [ deleteDomain, setDeleteDomain ] = useState(null);
  const [ showCreateDomain, setShowCreateDomain ] = useState(false);

  function loadStatusPage(statusPageId, childResourcesOnly, noLoading) {
    if (!childResourcesOnly && !noLoading) {
      setIsLoading(true);
    }
    return getStatusPage(statusPageId)
      .then(result => {
        if (childResourcesOnly) {
          setMonitors(result.statusPage.monitors);
          setDomains(result.statusPage.domains);
        } else {
          setStatusPage(result.statusPage);
        }
      })
      .catch(() => setIsLoading(false));
  }

  function doDeleteMonitor() {
    deleteStatusPageMonitor(deleteMonitor.monitorId)
      .then(() => {
        enqueueSnackbar(t('statuspages.monitorDeleted'), { variant: 'success' });
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.monitorDeleteFailed'), { variant: 'error' });
      })
      .finally(() => loadStatusPage(statusPageId, true));
    setDeleteMonitor(null);
  }

  function doDeleteDomain() {
    deleteStatusPageDomain(statusPageId, deleteDomain.domain)
      .then(() => {
        enqueueSnackbar(t('statuspages.domainDeleted'), { variant: 'success' });
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.domainDeleteFailed'), { variant: 'error' });
      })
      .finally(() => loadStatusPage(statusPageId, true));
    setDeleteDomain(null);
  }

  function doSaveStatusPage() {
    setIsSaving(true);
    updateStatusPage(statusPageId, {
        title: statusPageTitle,
        enabled: published,
        ...parseLogoDataUrl(logoDataUrl)
      })
      .then(() => {
        enqueueSnackbar(t('statuspages.statusPageUpdated'), { variant: 'success' });
      })
      .catch(() => {
        enqueueSnackbar(t('statuspages.statusPageUpdateFailed'), { variant: 'error' });
      })
      .then(() => loadStatusPage(statusPageId, false, true))
      .finally(() => setIsSaving(false));
  }

  function doDeleteStatusPage() {
    deleteStatusPage(statusPageId)
      .then(() => {
        enqueueSnackbar(t('statuspages.statusPageDeleted'), { variant: 'success' });
        history.push('/statuspages');
      })
      .catch(() => enqueueSnackbar(t('statuspages.statusPageDeleteFailed'), { variant: 'error' }))
      .finally(() => setShowDeleteStatusPage(false));
  }

  function onLogoFileChange(event) {
    const files = event.target.files || [];
    if (files.length !== 1) {
      return;
    }

    if (files[0].size > Config.maxLogoSize) {
      enqueueSnackbar(t('statuspages.logoTooBig', { limit: Config.maxLogoSize/1024 }), { variant: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = onLoadEvent => {
      const dataUrl = onLoadEvent.target.result;
      setLogoDataUrl(dataUrl);
    };
    reader.onerror = () => {
      enqueueSnackbar(t('statuspages.failedToLoadLogo'), { variant: 'error' });
    };

    reader.readAsDataURL(files[0]);
  }

  const onMonitorReorder = useCallback(reorderedMonitors => {
    setMonitors(reorderedMonitors);

    const newOrder = reorderedMonitors.map(x => x.monitorId);
    updateStatusPageMonitorsOrder(statusPageId, newOrder)
      .catch(() => enqueueSnackbar(t('statuspages.monitorOrderUpdateFailed'), { variant: 'error' }));
  }, [statusPageId, enqueueSnackbar, t]);

  useEffect(() => {
    loadStatusPage(statusPageId);
  }, [statusPageId]);

  useEffect(() => {
    if (statusPage) {
      setStatusPageTitle(statusPage.title);
      setMonitors(statusPage.monitors);
      setLogoDataUrl(statusPage.logo && statusPage.logoMimeType ? `data:${statusPage.logoMimeType};base64,${statusPage.logo}` : null);
      setDomains(statusPage.domains);
      setPublished(statusPage.enabled);
      setIsLoading(false);
    }
  }, [statusPage]);

  const onEditStatusPageMonitorClose = useCallback(doReload => {
    setEditMonitor(null);
    if (doReload) {
      loadStatusPage(statusPageId, true);
    }
  }, [statusPageId]);

  const onCreateMonitorClose = useCallback(doReload => {
    setShowCreateMonitor(false);
    if (doReload) {
      loadStatusPage(statusPageId, true);
    }
  }, [statusPageId]);

  const onCreateDomainClose = useCallback(doReload => {
    setShowCreateDomain(false);
    if (doReload) {
      loadStatusPage(statusPageId, true);
    }
  }, [statusPageId]);

  if (isLoading) {
    return <LinearProgress />;
  }

  if (!statusPage) {
    return <NotFound />;
  }

  const MONITOR_COLUMNS = [
    {
      head: t('statuspages.title'),
      cell: monitor => <div style={{display: 'flex', alignItems: 'center'}}>
        <IconAvatar icon={monitor.enabled ? MonitorIcon : MonitorDisabledIcon} color={monitor.enabled ? 'green' : 'default'} />
        <div>{monitor.monitorTitle}</div>
      </div>
    },
    {
      head: t('statuspages.job'),
      cell: monitor => <div>
        <div>{monitor.jobTitle}</div>
        <div><Typography variant="caption"><Link href={monitor.jobUrl} target="_blank" rel="noopener nofollow">{monitor.jobUrl}</Link></Typography></div>
      </div>
    },
    {
      head: t('statuspages.configuration'),
      cell: monitor => <div className={classes.config}>
        <div className={classes.configThresholds}>
          <Tooltip title={t('statuspages.thresholdUptimeTooltip')}>
            <div>
              <StatusPageConfigIcon icon={UptimeIcon} color='orange' />
              <span>{formatPercent(monitor.thresholdUptimeWarning, t)}</span>
              <StatusPageConfigIcon icon={UptimeIcon} color='red' />
              <span>{formatPercent(monitor.thresholdUptimeError, t)}</span>
            </div>
          </Tooltip>
          <Tooltip title={t('statuspages.thresholdLatencyTooltip')}>
            <div>
              <StatusPageConfigIcon icon={LatencyIcon} color='orange' />
              <span>{formatMs(monitor.thresholdLatencyWarning, t, true)}</span>
              <StatusPageConfigIcon icon={LatencyIcon} color='red' />
              <span>{formatMs(monitor.thresholdLatencyError, t, true)}</span>
            </div>
          </Tooltip>
        </div>
        <div className={classes.configPercentile}>
          <Tooltip title={t('statuspages.percentile')}>
            <span>{formatPercentile(monitor.percentile, t)}</span>
          </Tooltip>
        </div>
      </div>
    },
    {
      head: t('common.actions'),
      cell: monitor => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          className={classes.actionButton}
          onClick={() => setEditMonitor(monitor)}
          >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setDeleteMonitor(monitor)}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  const DOMAIN_COLUMNS = [
    {
      head: t('statuspages.domain'),
      cell: domain => <div style={{display: 'flex', alignItems: 'center'}}>
          <IconAvatar icon={DomainIcon} color={statusPage.enabled ? 'green' : 'default'} />
          <div>
            <div>{domain.domain}</div>
            {statusPage.enabled && <div><Typography variant="caption"><Link href={'https://'+domain.domain} target="_blank" rel="noopener nofollow">https://{domain.domain}</Link></Typography></div>}
          </div>
        </div>
    },
    {
      head: t('common.actions'),
      cell: domain => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setDeleteDomain(domain)}
          disabled={!domain.deletable}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  return <>
    <Breadcrumbs items={[
        {
          href: '/statuspages',
          text: t('common.statuspages')
        },
        {
          href: '/statuspages/' + statusPageId,
          text: statusPage.title
        }
      ]} />
    <Heading
      actionButtons={<ActionMenu
                        variant='contained'
                        size='small'
                        items={[
                          {
                            icon: <DeleteIcon fontSize='small' />,
                            text: t('common.delete'),
                            onClick: () => setShowDeleteStatusPage(true)
                          }
                        ]}
                        onClickItem={item => item.onClick()}
                        startIcon={<ActionsIcon />}
                        endIcon={<ExpandIcon />}
                        text={t('common.actions')}
                        />}>
      {t('statuspages.editHeading', { title: statusPage.title })}
    </Heading>
    <>
      <Paper className={classes.paper}>
        <Title>{t('statuspages.common')}</Title>
        <Grid container className={classes.grid} alignItems='center'>
          <Grid item xs={6}>
            <ValidatingTextField
                label={t('statuspages.title')}
                defaultValue={statusPageTitle}
                pattern={RegexPatterns.title}
                patternErrorText={t('common.checkInput')}
                onBlur={({target}) => setStatusPageTitle(target.value)}
                InputLabelProps={{shrink: true}}
                fullWidth
                required
                />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={<Switch />}
              label={t('statuspages.publish')}
              onChange={({target}) => setPublished(target.checked)}
              checked={published}
              />
          </Grid>
          <Grid item xs={12}>
            <InputLabel shrink>{t('statuspages.logo')}</InputLabel>
            <Box display='flex' alignItems='center'>
              <Box pr={2}>
                {logoDataUrl ? <img src={logoDataUrl} className={classes.logo} alt={t('statuspages.logo')} /> : <em>{t('statuspages.noLogo')}</em>}
              </Box>
              <Box pl={2}>
                <ButtonGroup variant='contained' size='small'>
                  <Button
                    component='label'
                    startIcon={<OpenIcon />}>
                    <input
                      hidden
                      accept='image/png'
                      id='logo-upload-input'
                      type='file'
                      onChange={onLogoFileChange} />
                    {logoDataUrl ? t('statuspages.replaceLogo') : t('statuspages.addLogo')}
                  </Button>
                  {logoDataUrl && <Button
                    onClick={() => setLogoDataUrl(null)}
                    startIcon={<DeleteIcon />}>
                    {t('statuspages.removeLogo')}
                  </Button>}
                </ButtonGroup>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} style={{ textAlign: 'right' }}>
            <Button
              variant='contained'
              startIcon={isSaving ? <CircularProgress size='small' /> : <SaveIcon />}
              color='primary'
              onClick={doSaveStatusPage}
              disabled={isSaving}>{t('common.save')}</Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} className={classes.domainsPaper}>
        <Title actionButtons={<>
          <Typography variant='caption' className={classes.quotaIndicator}>
            {statusPage !== null && t('common.quotaIndicator', { cur: domains.length, max: statusPage.maxDomains})}
          </Typography>
          <Button
            variant='contained'
            size='small'
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDomain(true)}
            disabled={statusPage === null || domains.length >= statusPage.maxDomains}
            >{t('statuspages.addDomain')}</Button>
          </>}>
          {t('statuspages.domains')}
        </Title>
        <Table
          columns={DOMAIN_COLUMNS}
          items={domains}
          empty={<em>{t('statuspages.noDomains')}</em>}
          loading={isLoading}
          rowIdentifier='domain'
          />
      </TableContainer>

      <TableContainer component={Paper} style={{overflowX: 'unset'}}>
        <Title actionButtons={<>
          <Typography variant='caption' className={classes.quotaIndicator}>
            {statusPage !== null && t('common.quotaIndicator', { cur: monitors.length, max: statusPage.maxMonitors})}
          </Typography>
          <Button
            variant='contained'
            size='small'
            startIcon={<AddIcon />}
            onClick={() => setShowCreateMonitor(true)}
            disabled={statusPage === null || monitors.length >= statusPage.maxMonitors}
            >{t('statuspages.addMonitor')}</Button>
          </>}>
          {t('statuspages.monitors')}
        </Title>
        <Table
          columns={MONITOR_COLUMNS}
          reorderable={true}
          onReorder={onMonitorReorder}
          items={monitors}
          empty={<em>{t('statuspages.noMonitors')}</em>}
          loading={isLoading}
          rowIdentifier='monitorId'
          />
      </TableContainer>
    </>
    {showCreateMonitor && <CreateStatusPageMonitorDialog statusPageId={statusPageId} onClose={onCreateMonitorClose} />}
    {editMonitor !== null && <EditStatusPageMonitorDialog monitor={editMonitor} onClose={onEditStatusPageMonitorClose} />}
    {deleteMonitor && <Dialog open={true} onClose={() => setDeleteMonitor(null)}>
      <DialogTitle>
        {t('statuspages.deleteMonitor', { title: deleteMonitor.monitorTitle })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('statuspages.confirmDeleteMonitor')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={() => setDeleteMonitor(null)}>
          {t('common.cancel')}
        </Button>
        <Button color='primary' onClick={() => doDeleteMonitor()}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>}
    {showCreateDomain && <CreateStatusPageDomainDialog statusPageId={statusPageId} onClose={onCreateDomainClose} />}
    {deleteDomain && <Dialog open={true} onClose={() => setDeleteDomain(null)}>
      <DialogTitle>
        {t('statuspages.deleteDomain', { domain: deleteDomain.domain })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('statuspages.confirmDeleteDomain')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={() => setDeleteDomain(null)}>
          {t('common.cancel')}
        </Button>
        <Button color='primary' onClick={() => doDeleteDomain()}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>}
    {showDeleteStatusPage && <Dialog open={true} onClose={() => setShowDeleteStatusPage(false)}>
      <DialogTitle>
        {t('statuspages.deleteStatusPage', { title: statusPage.title })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {statusPage.enabled ? t('statuspages.cannotDeletePublishedPage') : t('statuspages.confirmDeleteStatusPage')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={() => setShowDeleteStatusPage(false)}>
          {t('common.cancel')}
        </Button>
        {!statusPage.enabled && <Button color='primary' onClick={() => doDeleteStatusPage()}>
          {t('common.delete')}
        </Button>}
      </DialogActions>
    </Dialog>}
  </>;
}
