import { Button, Link, makeStyles, Paper, TableContainer, Typography } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStatusPages } from '../../utils/API';
import EditIcon from '@material-ui/icons/Edit';
import { useHistory } from 'react-router-dom';
import Breadcrumbs from '../misc/Breadcrumbs';
import Table from '../misc/Table';
import Heading from '../misc/Heading';
import { intersperse } from '../../utils/Utils';
import StatusPageIcon from '@material-ui/icons/NetworkCheck';
import IconAvatar from '../misc/IconAvatar';
import AddIcon from '@material-ui/icons/PostAdd';
import CreateStatusPageDialog from './CreateStatusPageDialog';

const useStyles = makeStyles((theme) => ({
  actionButton: {
    margin: theme.spacing(1)
  },
  quotaIndicator: {
    marginRight: theme.spacing(2)
  }
}));

export default function StatusPages() {
  const classes = useStyles();
  const { t } = useTranslation();
  const history = useHistory();

  const [statusPages, setStatusPages] = useState(null);
  const [maxStatusPages, setMaxStatusPages] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getStatusPages()
      .then(response => {
        setStatusPages(response.statusPages);
        setMaxStatusPages(response.maxStatusPages);
      });
  }, []);

  const COLUMNS = [
    {
      head: t('statuspages.title'),
      cell: page => <div style={{display: 'flex', alignItems: 'center'}}>
        <IconAvatar icon={StatusPageIcon} color={page.enabled ? 'green' : 'default'} />
        <div>
          <div>{page.title}</div>
          {page.enabled && <div><Typography variant="caption">
              {intersperse(page.domains.map((domain, key) =>
                <Link key={key} href={'https://' + domain} target="_blank" rel="noopener nofollow">https://{domain}</Link>), ', ')}
            </Typography></div>}
        </div>
      </div>
    },
    {
      head: t('statuspages.status'),
      cell: page => t('statuspages.' + (page.enabled ? 'published' : 'notPublished'))
    },
    {
      head: t('common.actions'),
      cell: page => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          className={classes.actionButton}
          onClick={() => history.push('/statuspages/' + page.statusPageId)}
          >
          {t('common.edit')}
        </Button>
      </>
    }
  ];

  return <>
    <Breadcrumbs items={[
      {
        href: '/statuspages',
        text: t('common.statuspages')
      }
    ]} />
    <Heading actionButtons={<>
        <Typography variant='caption' className={classes.quotaIndicator}>
          {statusPages !== null && t('common.quotaIndicator', { cur: statusPages.length, max: maxStatusPages})}
        </Typography>
        <Button
          variant='contained'
          size='small'
          startIcon={<AddIcon />}
          color='primary'
          onClick={() => setShowCreate(true)}
          disabled={statusPages === null || statusPages.length >= maxStatusPages}
          >{t('statuspages.createStatusPage')}</Button>
      </>}>
      {t('common.statuspages')}
    </Heading>
    <TableContainer component={Paper}>
      <Table
        columns={COLUMNS}
        items={statusPages || []}
        empty={<em>{t('statuspages.nostatuspages')}</em>}
        loading={statusPages === null}
        rowIdentifier='statusPageId'
        />
    </TableContainer>

    {showCreate && <CreateStatusPageDialog onClose={() => setShowCreate(false)} />}
  </>;
}
