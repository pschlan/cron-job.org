<?php
require_once('lib/APIMethod.php');
require_once('lib/RedisConnection.php');
require_once('resources/Job.php');

class GetJobStatusBadge extends AbstractAPIMethod {
  static function name() {
    return 'GetJobStatusBadge';
  }

  public function requiresAuthentication() {
    return false;
  }

  public function rateLimits($sessionToken) {
    return [
      new RateLimit(10, RateLimit::SECOND)
    ];
  }

  public function validateRequest($request) {
    return (
         isset($request->jobId)
      && is_numeric($request->jobId)
      && isset($request->token)
      && !empty($request->token)
      && isset($request->options)
      && is_numeric($request->options)
    );
  }

  private function getTextWidth($text, $fontName, $fontSize) {
    $box = imagettfbbox($fontSize, 0, dirname(__FILE__) . '/../fonts/' . $fontName . '.ttf', $text);
    return ($box[2] - $box[0]);
  }

  public function execute($request, $sessionToken, $language) {
    global $config;

    header('Content-Type: image/svg+xml; charset=utf-8');
    header('Cache-Control: max-age=60, private');

    header_remove('Pragma');
    header_remove('Expires');
    header_remove('Access-Control-Allow-Origin');
    header_remove('Access-Control-Allow-Credentials');

    $cacheKey = implode(':', ['jobStatusBadge', $request->jobId, $request->token, $request->options]);

    $redis = RedisConnection::get();
    if ($redis !== null) {
      $data = $redis->get($cacheKey);
      if ($data !== false) {
        echo $data;
        exit;
      }
    }

    $options = intval($request->options);

    $status = JobManager::getPublicJobStatus($request->jobId, $options, $request->token);
    if ($status === false) {
      throw new NotFoundAPIException();
    }

    $height = 20;
    $borderRadius = 3;

    $fontName = 'arial';
    $fontSizePx = 12;
    $fontSizePt = $fontSizePx * 0.75;

    $colors = [
      'error' => ['#ef5350', '#d32f2f', '#c62828'],
      'warn' => ['#ff9800', '#ed6c02', '#e65100'],
      'success' => ['#4caf50', '#2e7d32', '#1b5e20'],
      'unknown' => ['#03a9f4', '#0288d1', '#01579b']
    ];

    $title = '';
    if ($options & JobStatusBadgeOptions::WITH_TITLE) {
      $title = $status->title;
      if (empty($title)) {
        $title = 'Cron job';
      }
    }
    $titleWidth = $this->getTextWidth($title, $fontName, $fontSizePt);

    $statusText = 'unknown';
    $statusColor = 'unknown';
    $addLatency = false;
    $addLastExeuctionDate = false;

    if (!$status->enabled) {
      $statusText = 'inactive';
      $statusColor = 'warn';
    } else {
      if ($status->lastStatus === 0) {
        $statusText = 'not run yet';
        $statusColor = 'unknown';
      } else  if ($status->lastStatus === 1) {
        $statusText = 'success';
        $statusColor = 'success';
        $addLatency = true;
        $addLastExeuctionDate = true;
      } else  if ($status->lastStatus === 4) {
        $statusText = 'HTTP error';
        $statusColor = 'error';
        $addLastExeuctionDate = true;
      } else  if ($status->lastStatus === 5) {
        $statusText = 'timeout';
        $statusColor = 'error';
        $addLatency = true;
        $addLastExeuctionDate = true;
      } else {
        $statusText = 'failed';
        $statusColor = 'error';
        $addLastExeuctionDate = true;
      }
    }

    $extraText = [];

    if ($addLastExeuctionDate && ($options & JobStatusBadgeOptions::WITH_LAST_EXECUTION_DATE)) {
      if ($status->lastFetch > 0) {
        $lastFetch = new \DateTime('@' . $status->lastFetch);
        $lastFetch->setTimeZone(new \DateTimeZone($status->timezone));

        $diff = time() - $status->lastFetch;
        if ($diff < 86400) {
          $extraText[] = $lastFetch->format('H:i');
        } else {
          $extraText[] = $lastFetch->format('Y-m-d H:i');
        }
      }
    }

    if ($addLatency && ($options & JobStatusBadgeOptions::WITH_LATENCY)) {
      if ($status->lastDuration < 1000) {
        $extraText[] = sprintf('%d ms', $status->lastDuration);
      } else {
        $extraText[] = sprintf('%.01f s', round($status->lastDuration / 1000, 2));
      }
    }

    if (count($extraText) > 0) {
      $statusText .= ' (' . implode(', ', $extraText) . ')';
    }

    $statusTextWidth = $this->getTextWidth($statusText, $fontName, $fontSizePt);

    $leftWidth = 20 + ($titleWidth ? ($titleWidth + 6) : 0);
    $rightWidth = 6 + $statusTextWidth + 6;
    $totalWidth = $leftWidth + $rightWidth;

    $data = '<svg xmlns="http://www.w3.org/2000/svg" width="'.$totalWidth.'" height="'.$height.'">';
    $data .= '<title>' . htmlentities($title, ENT_QUOTES | ENT_SUBSTITUTE | ENT_XHTML, 'UTF-8') . '</title>';

    $data .= '<defs>';
    $data .= '<linearGradient id="left-fill" x1="50%" y1="0%" x2="50%" y2="100%">';
    $data .= '<stop stop-color="#fc6e46" offset="0%" />';
    $data .= '<stop stop-color="#c33d1b" offset="100%" />';
    $data .= '</linearGradient>';
    $data .= '<linearGradient id="right-fill" x1="50%" y1="0%" x2="50%" y2="100%">';
    $data .= '<stop stop-color="'.$colors[$statusColor][0].'" offset="0%" />';
    $data .= '<stop stop-color="'.$colors[$statusColor][1].'" offset="100%" />';
    $data .= '</linearGradient>';

    $data .= '<clipPath id="clipPath53">';
    $data .= '<path transform="translate(-66.393,-52.724)" d="M 0,76.535 H 340.158 V 0 H 0 Z" />';
    $data .= '</clipPath>';
    $data .= '<clipPath id="clipPath8">';
    $data .= '<path transform="translate(-68.738,-55.884)" d="M 0,76.535 H 340.158 V 0 H 0 Z" />';
    $data .= '</clipPath>';

    $data .= '</defs>';

    $data .= '<g fill="none">';

    $data .= '<g font-size="'.$fontSizePx.'" font-family="'.$fontName.',sans-serif">';
    $data .= '<path d="M0,'.$borderRadius.' a'.$borderRadius.','.$borderRadius.' 0 0 1 '.$borderRadius.',-'.$borderRadius.' L'.$leftWidth.',0 L'.$leftWidth.','.$height.' L'.$borderRadius.','.$height.' a'.$borderRadius.','.$borderRadius.' 0 0 1 -'.$borderRadius.',-'.$borderRadius.' L0,'.$borderRadius.' L0,0 Z" fill="url(#left-fill)" fill-rule="nonzero" />';
    $data .= '<text fill="#c33d1b" aria-hidden="true"><tspan x="19.5" y="14.5">' .  htmlentities($title, ENT_QUOTES | ENT_SUBSTITUTE | ENT_XHTML, 'UTF-8') . '</tspan></text>';
    $data .= '<text fill="#FFFFFF"><tspan x="19" y="14">' .  htmlentities($title, ENT_QUOTES | ENT_SUBSTITUTE | ENT_XHTML, 'UTF-8') . '</tspan></text>';
    $data .= '</g>';

    $data .= '<g transform="translate(' . $leftWidth  . ')" font-size="'.$fontSizePx.'" font-family="'.$fontName.',sans-serif">';
    $data .= '<path d="M0,0 L'.($rightWidth-$borderRadius).',0 a'.$borderRadius.','.$borderRadius.' 0 0 1 '.$borderRadius.','.$borderRadius.' L'.$rightWidth.','.($height-$borderRadius).' a'.$borderRadius.','.$borderRadius.' 0 0 1 -'.$borderRadius.','.$borderRadius.' L0,'.$height.' L0,0 Z" fill="url(#right-fill)" fill-rule="nonzero" />';
    $data .= '<text fill="'.$colors[$statusColor][1].'" aria-hidden="true"><tspan x="6.5" y="14.5">' . $statusText . '</tspan></text>';
    $data .= '<text fill="#ffffff"><tspan x="6" y="14">' . $statusText . '</tspan></text>';
    $data .= '</g>';

    $data .= '<g transform="matrix(.84543 0 0 .84543 2.2756 1.171)" fill="#fff">';
    $data .= '<path transform="matrix(.44443 0 0 -.44443 11.205 3.2705)" d="m-3.0586 0.24779c-3.0992-0.075141-6.2652-1.1266-9.0117-3.2153-3.646-2.729-6.4495-7.4282-6.6035-12.867-0.183-5.433 2.3615-10.211 5.9795-12.942 3.617-2.784 8.1606-3.6084 12.308-2.6294 8.299 2.19 12.486 9.1606 12.576 16.203-0.11 7.042-4.222 13.473-12.189 15.204-1.0005 0.19-2.0255 0.27261-3.0586 0.24756zm1.8179-3.1875c0.4017-0.021487 0.80066-0.066695 1.1938-0.1377 6.412-1.098 10.03-6.3294 10.075-12.171-0.063-5.835-3.7574-11.477-10.378-12.895-6.52-1.494-14.139 3.8929-13.901 12.4 0.24188 7.9678 6.9852 13.127 13.011 12.804z" clip-path="url(#clipPath8)" fill="#fff"/>';
    $data .= '<path transform="matrix(.44443 0 0 -.44443 10.162 4.6749)" d="m0 0 1.464-13.416 6.319-3.307 0.716 1.53-4.405 3.159-2.243 11.924z" clip-path="url(#clipPath53)" fill="#fff"/>';
    $data .= '</g>';

    $data .= '</g>';
    $data .= '</svg>';

    echo $data;

    if ($redis !== null) {
      $redis->set($cacheKey, $data, $config['statusBadgeCacheTimeSeconds']);
    }

    exit;
  }
}
