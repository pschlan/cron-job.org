import React, { useState } from 'react';
import Breadcrumbs from '../misc/Breadcrumbs';
import { useTranslation } from 'react-i18next';
import Heading from '../misc/Heading';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, TableContainer, makeStyles } from '@material-ui/core';
import useFolders from '../../hooks/useFolders';
import Table from '../misc/Table';
import IconAvatar from '../misc/IconAvatar';
import FolderIcon from '@material-ui/icons/FolderOutlined';
import AddFolderIcon from '@material-ui/icons/CreateNewFolderOutlined';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import CreateFolderDialog from './CreateFolderDialog';
import EditFolderDialog from './EditFolderDialog';
import { useSnackbar } from 'notistack';
import { deleteFolder, getFolders } from '../../utils/API';
import { useDispatch } from 'react-redux';
import { setFolders } from '../../redux/actions';

const useStyles = makeStyles((theme) => ({
  actionButton: {
    margin: theme.spacing(1)
  }
}));

export default function Folders() {
  const { t } = useTranslation();
  const folders = useFolders();
  const classes = useStyles();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [editFolder, setEditFolder] = useState(null);
  const [showDeleteFolder, setShowDeleteFolder] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();

  function doDeleteFolder() {
    deleteFolder(showDeleteFolder.folderId)
      .then(() => {
        enqueueSnackbar(t('jobs.folders.folderDeleted'), { variant: 'success' });
      })
      .catch(() => {
        enqueueSnackbar(t('jobs.folders.folderDeleteFailed'), { variant: 'error' });
      })
      .finally(() => getFolders().then(response => dispatch(setFolders(response.folders))));
    setShowDeleteFolder(null);
  }

  const COLUMNS = [
    {
      head: t('jobs.folders.title'),
      cell: folder => <div style={{display: 'flex', alignItems: 'center'}}>
        <IconAvatar icon={FolderIcon} color='green' />
        <div>
          {folder.title}
        </div>
      </div>
    },
    {
      head: t('common.actions'),
      cell: folder => <>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          className={classes.actionButton}
          onClick={() => setEditFolder(folder)}
          >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeleteIcon />}
          className={classes.actionButton}
          onClick={() => setShowDeleteFolder(folder)}
          >
          {t('common.delete')}
        </Button>
      </>
    }
  ];

  return <>
    <Breadcrumbs items={[
        {
          href: '/jobs',
          text: t('common.cronjobs')
        },
        {
          href: '/jobs/folders',
          text: t('jobs.folders.manage')
        }
      ]} />
    <Heading actionButtons={<>
        <Button
          variant='contained'
          size='small'
          startIcon={<AddFolderIcon />}
          onClick={() => setShowCreateFolder(true)}
          disabled={folders === null}
          >{t('jobs.folders.create')}</Button>
      </>}>
      {t('jobs.folders.manage')}
    </Heading>
    <TableContainer component={Paper}>
      <Table
        columns={COLUMNS}
        items={folders || []}
        empty={<em>{t('jobs.folders.noFolders')}</em>}
        loading={folders === null}
        rowIdentifier='folderId'
        />
    </TableContainer>

    {showCreateFolder && <CreateFolderDialog onClose={() => setShowCreateFolder(false)} />}
    {editFolder!==null && <EditFolderDialog folder={editFolder} onClose={() => setEditFolder(null)} />}
    {showDeleteFolder!==null && <Dialog open={true} onClose={() => setShowDeleteFolder(null)}>
      <DialogTitle>
        {t('jobs.folders.delete', { title: showDeleteFolder.title })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('jobs.folders.confirmDeleteFolder')}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={() => setShowDeleteFolder(null)}>
          {t('common.cancel')}
        </Button>
        <Button color='primary' onClick={() => doDeleteFolder()}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>}
  </>;
}