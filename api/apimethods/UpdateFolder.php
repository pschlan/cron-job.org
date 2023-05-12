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
      && isset($request->title)
      && !empty(trim($request->title))
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      (new FolderManager($sessionToken))
        ->updateFolder($request->folderId, trim($request->title));
      return true;
    } catch (FolderAlreadyExistsException $ex) {
      throw new ConflictAPIException();
    }
  }
}
