<?php
require_once('lib/Task.php');
require_once('lib/Database.php');

class ImportBannedEmailDomains implements Task {
  public function run() {
    $importedCount = 0;

    Database::get()->beginTransaction();
    Database::get()->prepare('DELETE FROM `banned_email_domain`')->execute();

    $insertStmt = Database::get()->prepare('REPLACE INTO `banned_email_domain`(`domain`) VALUES(:domain)');

    $fp = fopen('php://stdin', 'r');
    while ($line = fgets($fp)) {
      $line = strtolower(trim($line));

      if (empty($line) || $line[0] == '#') {
        continue;
      }

      if (strpos($line, '.') === false) {
        echo "Skipping invalid domain: $line\n";
      }

      $insertStmt->execute([':domain' => $line]);

      ++$importedCount;
    }
    fclose($fp);

    if ($importedCount <= 0) {
      Database::get()->rollbackTransaction();

      echo "Nothing imported.\n";
    } else {
      Database::get()->commitTransaction();

      echo "$importedCount domains imported.\n";
    }

    return 0;
  }
}
