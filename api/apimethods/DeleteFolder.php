<?php
require_once('lib/APIMethod.php');
require_once('resources/Folder.php');

class DeleteFolder extends AbstractAPIMethod {
  static function name() {
    return 'DeleteFolder';
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
    );
  }

  public function execute($request, $sessionToken, $language) {
    (new FolderManager($sessionToken))
      ->deleteFolder($request->folderId);
    return true;
  }
}
