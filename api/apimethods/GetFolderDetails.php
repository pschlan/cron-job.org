<?php
require_once('lib/APIMethod.php');
require_once('resources/Folder.php');

class GetFolderDetails extends AbstractAPIMethod {
  static function name() {
    return 'GetFolderDetails';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(5, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->folderId)
      && is_numeric($request->folderId)
    );
  }

  public function execute($request, $sessionToken, $language) {
    $folderDetails = (new FolderManager($sessionToken))->getFolder($request->folderId);
    if ($folderDetails === false) {
      throw new NotFoundAPIException();
    }

    return (object)[
      'folderDetails' => $folderDetails
    ];
  }
}
