<?php
require_once('lib/APIMethod.php');
require_once('resources/Folder.php');

class UpdateFolder extends AbstractAPIMethod {
  static function name() {
    return 'UpdateFolder';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->folderId)
      && is_numeric($request->folderId)
      && isset($request->folder)
      && is_object($request->folder)
      && isset($request->folder->title)
      && !empty(trim($request->folder->title))
    );
  }

  public function execute($request, $sessionToken, $language) {
    $folderManager = new FolderManager($sessionToken);

    if ($folderManager->getFolder($request->folderId) === false) {
      throw new NotFoundAPIException();
    }

    try {
      $folderManager->updateFolder($request->folderId, trim($request->folder->title));
      return (object)[];
    } catch (FolderAlreadyExistsException $ex) {
      throw new ConflictAPIException();
    }
  }
}
