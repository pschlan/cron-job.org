<?php
class ExecutionDate {
  private $time;

  function __construct($time) {
    $this->time = $time;
  }

  public function addMinutes($n) {
		$this->time = strtotime(sprintf('+%d minutes', $n), $this->time);
  }

	public function addDays($n) {
		$this->time = strtotime(sprintf('+%d days', $n), $this->time);
	}

	public function addHours($n) {
		$this->time = strtotime(sprintf('+%d hours', $n), $this->time);
	}

	public function addMonths($n) {
		$this->time = strtotime(sprintf('+%d months', $n), $this->time);
	}

	public function month() {
		return date('n', $this->time);
	}

	public function day() {
		return date('j', $this->time);
	}

	public function weekDay() {
		return date('w', $this->time);
	}

	public function hour() {
		return date('H', $this->time);
	}

	public function minute() {
		return date('i', $this->time);
	}

	public function setDay($d) {
		$m = date('n', $this->time);
		$y = date('Y', $this->time);
		$h = date('H', $this->time);
		$i = date('i', $this->time);
		$s = date('s', $this->time);

		$this->time = mktime($h, $i, $s, $m, $d, $y);
	}

	public function setHour($h) {
		$d = date('j', $this->time);
		$m = date('n', $this->time);
		$y = date('Y', $this->time);
		$i = date('i', $this->time);
		$s = date('s', $this->time);

		$this->time = mktime($h, $i, $s, $m, $d, $y);
	}

	public function setMinute($i) {
		$d = date('j', $this->time);
		$m = date('n', $this->time);
		$y = date('Y', $this->time);
		$h = date('H', $this->time);
		$s = date('s', $this->time);

		$this->time = mktime($h, $i, $s, $m, $d, $y);
	}

	public function setSeconds($s) {
		$d = date('j', $this->time);
		$m = date('n', $this->time);
		$y = date('Y', $this->time);
		$h = date('H', $this->time);
		$i = date('i', $this->time);

		$this->time = mktime($h, $i, $s, $m, $d, $y);
  }

  public function timestamp() {
    return $this->time;
  }

  public function expiryCompareVal() {
    return intval(date('YmdHis', $this->time));
  }
}

class ExecutionPredictor {
  private $timezone;
  private $months;
  private $mdays;
  private $wdays;
  private $hours;
  private $minutes;
  private $expiresAt;

  //! @note Pre-computed once in the constructor and reused across every predictNextExecution()
  //!       call: wildcard flags avoid the repeated "!= array(-1)" comparisons, the *Set lookup
  //!       tables replace O(n) in_array() checks, and the sorted hour/minute arrays let the search
  //!       loop jump straight to the next matching value instead of stepping one unit at a time.
  private $monthsWild, $mdaysWild, $wdaysWild, $hoursWild, $minutesWild;
  private $monthSet, $mdaySet, $wdaySet, $hourSet, $minuteSet;
  private $sortedHours, $sortedMinutes;

  function __construct($timezone, $months, $mdays, $wdays, $hours, $minutes, $expiresAt = 0) {
    $this->timezone   = $timezone;
    if ($this->timezone === 'Europe/Kiev') {
      $this->timezone = 'Europe/Kyiv';
    }
    $this->months     = $months;
    $this->mdays      = $mdays;
    $this->wdays      = $wdays;
    $this->hours      = $hours;
    $this->minutes    = $minutes;
    $this->expiresAt  = $expiresAt;

    $this->monthsWild   = self::isWildcard($months);
    $this->mdaysWild    = self::isWildcard($mdays);
    $this->wdaysWild    = self::isWildcard($wdays);
    $this->hoursWild    = self::isWildcard($hours);
    $this->minutesWild  = self::isWildcard($minutes);

    //! @note Integer keys, so lookups must use intval() on the (possibly zero-padded, e.g. "06")
    //!       date() strings returned by ExecutionDate.
    $this->monthSet     = array_flip($months);
    $this->mdaySet      = array_flip($mdays);
    $this->wdaySet      = array_flip($wdays);
    $this->hourSet      = array_flip($hours);
    $this->minuteSet    = array_flip($minutes);

    $this->sortedHours = $hours;
    sort($this->sortedHours);
    $this->sortedMinutes = $minutes;
    sort($this->sortedMinutes);
  }

  private static function isWildcard($array) {
    return count($array) === 1 && intval(reset($array)) === -1;
  }

  //! @note Smallest element of a sorted (ascending) array that is >= $value, or null if none.
  private static function nextGE($sortedArray, $value) {
    foreach ($sortedArray as $v) {
      if ($v >= $value) {
        return $v;
      }
    }
    return null;
  }

  public function predictNextExecutions($now, $n = 3) {
    $result = array();

    for ($i = 0; $i < $n; ++$i) {
      $now = $this->predictNextExecution($now);
      if ($now === false) {
        break;
      }
      $result[] = $now;
    }

	  return $result;
  }

  public function predictNextExecution($now) {
    $oldTimezone = date_default_timezone_get();
    date_default_timezone_set($this->timezone);
    if ($now === null) {
      $now = time();
    }
    $result = $this->_predictNextExecution($now);
    date_default_timezone_set($oldTimezone);

    return $result;
  }

  private function _predictNextExecution($now) {
    $maxIterations = 2048;

    if (count($this->months) == 0
        || count($this->mdays) == 0
        || count($this->wdays) == 0
        || count($this->hours) == 0
        || count($this->minutes) == 0) {
      return false;
    }

    if (!$this->monthsWild) {
      $maxLimit = 0;

      foreach ($this->months as $m) {
        if (in_array($m, array(4, 6, 9, 11)))
          $maxLimit = max($maxLimit, 30);
        else if ($m == 2)
          $maxLimit = max($maxLimit, 29);
        else
          $maxLimit = 31;
      }

      if (max($this->mdays) > $maxLimit)
        return false;
    }

    $next = new ExecutionDate($now);
    $next->addMinutes(1);
    $next->setSeconds(0);

    $iterations = 0;
    while (true) {
      if (++$iterations == $maxIterations)
        return false;

      if (!$this->monthsWild && !isset($this->monthSet[intval($next->month())])) {
        $next->addMonths(1);
        $next->setDay(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if (!$this->mdaysWild && !$this->wdaysWild && (!isset($this->mdaySet[intval($next->day())]) && !isset($this->wdaySet[intval($next->weekDay())]))) {
        $next->addDays(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if (!$this->mdaysWild && $this->wdaysWild && !isset($this->mdaySet[intval($next->day())])) {
        $next->addDays(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if (!$this->wdaysWild && $this->mdaysWild && !isset($this->wdaySet[intval($next->weekDay())])) {
        $next->addDays(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if (!$this->hoursWild && !isset($this->hourSet[intval($next->hour())])) {
        //! @note Jump straight to the next valid hour today (or roll to the next day) instead of
        //!       stepping one hour at a time; resetting the minute lets the minute check below
        //!       pick the first valid minute of the new hour.
        $nh = self::nextGE($this->sortedHours, intval($next->hour()));
        if ($nh === null) {
          $next->addDays(1);
          $next->setHour(0);
          $next->setMinute(0);
        } else {
          $next->setHour($nh);
          $next->setMinute(0);
        }
        continue;
      }

      if (!$this->minutesWild && !isset($this->minuteSet[intval($next->minute())])) {
        //! @note The month/day/hour are already valid here, so jump directly to the next valid
        //!       minute within this hour; if there is none, roll to the next hour and re-check.
        $nm = self::nextGE($this->sortedMinutes, intval($next->minute()));
        if ($nm === null) {
          $next->setMinute(0);
          $next->addHours(1);
          continue;
        }
        $next->setMinute($nm);
      }

      break;
    }

    if ($this->expiresAt > 0 && $next->expiryCompareVal() > $this->expiresAt) {
      return false;
    }

    return $next->timestamp();
  }
}
