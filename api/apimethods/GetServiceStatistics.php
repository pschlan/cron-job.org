<?php
require_once('lib/APIMethod.php');
require_once('resources/Statistics.php');

class GetServiceStatistics extends AbstractAPIMethod {
  static function name() {
    return 'GetServiceStatistics';
  }

  public function requiresAuthentication() {
    return true;
  }

  public function rateLimits() {
    return [
      new RateLimit(1, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return true;
  }

  public function execute($request, $sessionToken, $language) {
    $statsManager = new StatisticsManager($sessionToken);
    return (object)[
      'executionStats' => $statsManager->getServiceExecutionStatsForLast24Hours(time()),
      'commonStats' => $statsManager->getCommonStats()
    ];
  }
}
