<?php
require_once('config/config.inc.php');
require_once('lib/Database.php');
require_once('lib/Exceptions.php');
require_once('resources/Node.php');

class FolderAlreadyExistsException extends Exception {}

class Folder {
  public $folderId;
  public $title;

  function __construct() {
    $this->folderId = intval($this->folderId);
  }
}

class FolderManager {
  private $authToken;

  function __construct($authToken) {
    $this->authToken = $authToken;
  }

  public function getFolders() {
    $stmt = Database::get()->prepare('SELECT `folderid` AS `folderId`, `title` FROM `folder` WHERE `userid`=:userId ORDER BY `title` ASC');
    $stmt->setFetchMode(PDO::FETCH_CLASS, Folder::class);
    $stmt->execute([':userId' => $this->authToken->userId]);

    $result = [];
    while ($entry = $stmt->fetch()) {
      $result[] = $entry;
    }

    return $result;
  }

  public function createFolder($title) {
    try {
      $stmt = Database::get()->prepare('INSERT INTO `folder`(`userid`, `title`) '
        . 'VALUES(:userId, :title)');
      $stmt->execute(array(
        ':userId'     => $this->authToken->userId,
        ':title'      => $title,
      ));
      return (int)Database::get()->insertId();
    } catch (PDOException $ex) {
      if (intval($ex->getCode()) === 23000) {
        throw new FolderAlreadyExistsException();
      }
      throw $ex;
    }
  }

  public function updateFolder($folderId, $title) {
    try {
      $stmt = Database::get()->prepare('UPDATE `folder` SET '
        . '`title`=:title WHERE `userid`=:userId AND `folderid`=:folderId');
      $stmt->execute(array(
        ':userId'     => $this->authToken->userId,
        ':folderId'   => $folderId,
        ':title'      => $title,
      ));
    } catch (PDOException $ex) {
      if (intval($ex->getCode()) === 23000) {
        throw new FolderAlreadyExistsException();
      }
      throw $ex;
    }
  }

  public function deleteFolder($folderId) {
    $nodes = (new NodeManager($this->authToken))->getUserJobNodes();
    $someFailed = false;

    foreach ($nodes as $node) {
      try {
        $client = $node->connect();

        $client->moveJobsFromUserFolder($this->authToken->userId, $folderId, 0);
      } catch (Exception $ex) {
        $someFailed = true;
      }
    }

    if ($someFailed) {
      throw new Exception('Failed to move jobs to root folder!');
    }

    $stmt = Database::get()->prepare('DELETE FROM `folder` '
      . 'WHERE `userid`=:userId AND `folderid`=:folderId');
    $stmt->execute(array(
      ':userId'     => $this->authToken->userId,
      ':folderId'   => $folderId
    ));
  }
}
