import { useTranslation } from 'react-i18next';
import useFolders from './useFolders';

export default function useFolder(match) {
  const { t } = useTranslation();
  const folderId = match && match.params && match.params.folderId === 'all' ? 'all' : parseInt((match && match.params && match.params.folderId) || 0);
  const folders = useFolders();
  const folder = folderId === 'all' ? { 'folderid': 'all', 'title': t('jobs.allJobs') } : (folders && (folders.find(x => x.folderId === folderId) || null)) || null;
  const folderTitle = folder && folder.title;
  const folderBreadcrumb = folder ? [
    {
      href: '/jobs/folders/' + folderId,
      text: folderTitle
    }
  ] : [];
  const urlPrefix = (folderId === 'all' || folderId > 0) ? '/jobs/folders/' + folderId : '/jobs';

  return {
    folder, folderId, folderTitle, folderBreadcrumb, urlPrefix, folders
  };
}
