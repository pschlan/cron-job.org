import useFolders from './useFolders';

export default function useFolder(match) {
  const folderId = parseInt((match && match.params && match.params.folderId) || 0);
  const folders = useFolders();
  const folder = (folders && (folders.find(x => x.folderId === folderId) || null)) || null;
  const folderTitle = folder && folder.title;
  const folderBreadcrumb = folder ? [
    {
      href: '/jobs/folders/' + folderId,
      text: folderTitle
    }
  ] : [];
  const urlPrefix = folderId > 0 ? '/jobs/folders/' + folderId : '/jobs';

  return {
    folder, folderId, folderTitle, folderBreadcrumb, urlPrefix, folders
  };
}
