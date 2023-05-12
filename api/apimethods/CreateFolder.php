<?php
require_once('lib/APIMethod.php');
require_once('resources/Folder.php');

class CreateFolder extends AbstractAPIMethod {
  static function name() {
    return 'CreateFolder';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(1, RateLimit::SECOND),
      new RateLimit(10, RateLimit::MINUTE)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->title)
      && !empty(trim($request->title))
    );
  }

  public function execute($request, $sessionToken, $language) {
    try {
      $folderId = (new FolderManager($sessionToken))
        ->createFolder(trim($request->title));

      if ($folderId === false) {
        throw new InternalErrorAPIException();
      }

      return (object)[
        'folderId' => $folderId
      ];
    } catch (FolderAlreadyExistsException $ex) {
      throw new ConflictAPIException();
    }
  }
}
