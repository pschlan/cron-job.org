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
}

class ExecutionPredictor {
  private $timezone;
  private $months;
  private $mdays;
  private $wdays;
  private $hours;
  private $minutes;
  
  function __construct($timezone, $months, $mdays, $wdays, $hours, $minutes) {
    $this->timezone = $timezone;
    $this->months   = $months;
    $this->mdays    = $mdays;
    $this->wdays    = $wdays;
    $this->hours    = $hours;
    $this->minutes  = $minutes;
  }

  public function predictNextExecutions($now, $n = 3) {
    $result = array();

    for ($i = 0; $i < $n; ++$i) {
      $now = $this->predictNextExecution($now);
      if ($now === false)
        break;
      $result[] = $now;
    }

	  return $result;
  }

  public function predictNextExecution($now) {
    $oldTimezone = date_default_timezone_get();
    date_default_timezone_set($this->timezone);

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

    if ($this->months != array(-1)) {
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

      if ($this->months != array(-1) && !in_array($next->month(), $this->months)) {
        $next->addMonths(1);
        $next->setDay(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if ($this->mdays != array(-1) && !in_array($next->day(), $this->mdays)) {
        $next->addDays(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if ($this->wdays != array(-1) && !in_array($next->weekDay(), $this->wdays)) {
        $next->addDays(1);
        $next->setHour(0);
        $next->setMinute(0);
        continue;
      }

      if ($this->hours != array(-1) && !in_array($next->hour(), $this->hours)) {
        $next->addHours(1);
        $next->setMinute(0);
        continue;
      }

      if ($this->minutes != array(-1) && !in_array($next->minute(), $this->minutes)) {
        $next->addMinutes(1);
        continue;
      }

      break;
    }

    return $next->timestamp();
  }
}
