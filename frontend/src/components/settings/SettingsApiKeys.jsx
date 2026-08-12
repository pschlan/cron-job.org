import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup, makeStyles, TableContainer, Typography, Paper } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { getAPIKeys } from '../../utils/API';
import useUserProfile from '../../hooks/useUserProfile';
import Title from '../misc/Title';
import ShowAPIKeyDialog from './ShowAPIKeyDialog';
import DeleteAPIKeyDialog from './DeleteAPIKeyDialog';
import CreateAPIKeyDialog from './CreateAPIKeyDialog';
import EditAPIKeyDialog from './EditAPIKeyDialog';
import ApiKeyIcon from '@material-ui/icons/VpnKey';
import DeleteIcon from '@material-ui/icons/Delete';
import ShowKeyIcon from '@material-ui/icons/Visibility';
import EditIcon from '@material-ui/icons/Edit';
import AddIcon from '@material-ui/icons/Add';
import DocsIcon from '@material-ui/icons/HelpOutline';
import IconAvatar from '../misc/IconAvatar';
import Table from '../misc/Table';
import { Config } from '../../utils/Config';

const useStyles = makeStyles(theme => ({
  quotaIndicator: {
    marginRight: theme.spacing(2)
  },
  actionButton: {
    margin: theme.spacing(0.5)
  }
}));

export default function SettingsApiKeys() {
  const classes = useStyles();
  const { t } = useTranslation();
  const userProfile = useUserProfile();

  const [ isLoadingApiKeys, setIsLoadingApiKeys ] = useState(true);
  const [ apiKeys, setApiKeys ] = useState([]);
  const [ showCreateApiKey, setShowCreateApiKey ] = useState(false);
  const [ showApiKey, setShowApiKey ] = useState(null);
  const [ deleteApiKey, setDeleteApiKey ] = useState(null);
  const [ editApiKey, setEditApiKey ] = useState(null);

  function refreshApiKeys() {
    setIsLoadingApiKeys(true);
    getAPIKeys()
      .then(response => setApiKeys(response.apiKeys))
      .finally(() => setIsLoadingApiKeys(false));
  }

  useEffect(() => {
    refreshApiKeys();
  }, []);

  const APIKEY_COLUMNS = [
    {
      head: t('settings.apiKeys.title'),
      cell: apiKey => <div style={{display: 'flex', alignItems: 'center'}}>
          <IconAvatar icon={<ApiKeyIcon />} color={apiKey.enabled ? 'green' : 'default'} />
          <div>
            {apiKey.title}
          </div>
        </div>
    },
    {
      head: t('settings.apiKeys.ipLimit'),
      cell: apiKey => <>
        {apiKey.limitIPs.length > 0 ? <>
          {apiKey.limitIPs.slice(0, 5).join(', ')}
          {apiKey.limitIPs.length > 5 && <>...</>}
        </> : <em>{t('settings.apiKeys.unrestricted')}</em>}
      </>
    },
    {
      head: t('common.actions'),
      cell: apiKey => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShowKeyIcon />}
          className={classes.actionButton}
          onClick={() => setShowApiKey(apiKey)}
          >
          {t('settings.apiKeys.showKey')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          className={classes.actionButton}
          onClick={() => setEditApiKey(apiKey)}
          >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setDeleteApiKey(apiKey)}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  return <>
    <TableContainer component={Paper}>
      <Title actionButtons={<div style={{display: 'flex', alignItems: 'center'}}>
          <Typography variant='caption' className={classes.quotaIndicator}>
            {userProfile !== null && userProfile.userGroup && !isLoadingApiKeys && t('common.quotaIndicator', { cur: apiKeys.length, max: userProfile.userGroup.maxApiKeys})}
          </Typography>
          <ButtonGroup variant='contained' size='small'>
            <Button
              variant='contained'
              size='small'
              startIcon={<AddIcon />}
              onClick={() => setShowCreateApiKey(true)}
              disabled={!userProfile || !userProfile.userGroup || isLoadingApiKeys || apiKeys.length >= userProfile.userGroup.maxApiKeys}
              >{t('settings.apiKeys.add')}
            </Button>
            <Button
              variant='contained'
              size='small'
              startIcon={<DocsIcon />}
              href={Config.apiDocsURL}
              target='_blank'
              rel='noopener'
              >{t('settings.apiKeys.showDocs')}
            </Button>
          </ButtonGroup>
        </div>}>
        {t('settings.apiKeys.keys')}
      </Title>
      <Table
        columns={APIKEY_COLUMNS}
        items={apiKeys}
        empty={<em>{t('settings.apiKeys.noKeys')}</em>}
        loading={isLoadingApiKeys}
        rowIdentifier='apiKeyId'
        />
    </TableContainer>

    {showApiKey!==null && <ShowAPIKeyDialog apiKey={showApiKey} onClose={() => setShowApiKey(null)} />}
    {deleteApiKey!==null && <DeleteAPIKeyDialog apiKey={deleteApiKey} onClose={() => setDeleteApiKey(null)} onRefreshAPIKeys={() => refreshApiKeys()} />}
    {showCreateApiKey && <CreateAPIKeyDialog onClose={() => setShowCreateApiKey(false)} onRefreshAPIKeys={() => refreshApiKeys()} />}
    {editApiKey!==null && <EditAPIKeyDialog apiKey={editApiKey} onClose={() => setEditApiKey(null)} onRefreshAPIKeys={() => refreshApiKeys()} />}
  </>;
}
