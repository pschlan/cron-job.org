<?php
require_once('lib/APIMethod.php');
require_once('resources/Folder.php');

class GetFolders extends AbstractAPIMethod {
  static function name() {
    return 'GetFolders';
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
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    return (object)[
      'folders' => (new FolderManager($sessionToken))->getFolders()
    ];
  }
}
