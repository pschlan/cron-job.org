import moment from 'moment';

export class ExecutionDate {
  constructor(time) {
    this.time = time;
  }

  static fromDate(time) {
    return new ExecutionDate(moment.utc([
      time.getFullYear(),
      time.getMonth(),
      time.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds(),
      0
    ]));
  }

  static now() {
    return ExecutionDate.fromDate(new Date());
  }

  addMinutes(n) {
    this.time.add(n, 'm');
  }

  addDays(n) {
    this.time.add(n, 'd');
  }

  addHours(n) {
    this.time.add(n, 'h');
  }

  addMonths(n) {
    this.time.add(n, 'M');
  }

  year() {
    return this.time.year();
  }

  month() {
    return this.time.month() + 1;
  }

  day() {
    return this.time.date();
  }

  weekDay() {
    return this.time.day();
  }

  hour() {
    return this.time.hour();
  }

  minute() {
    return this.time.minute();
  }

  second() {
    return this.time.second();
  }

  expiryCompareVal() {
    return (
      this.year() * 10000000000
      + this.month() * 100000000
      + this.day() * 1000000
      + this.hour() * 10000
      + this.minute() * 100
    );
  }

  setDay(d) {
    this.time.date(d);
  }

  setHour(h) {
    this.time.hour(h);
  }

  setMinute(m) {
    this.time.minute(m);
  }

  setSecond(s) {
    this.time.second(s);
  }

  format(f) {
    //! @note Create a new moment object to ensure we use the current locale (important for language switch)
    return moment.utc(this.time.valueOf()).format(f);
  }

  clone() {
    return new ExecutionDate(this.time.clone());
  }
}

function isWildcard(array) {
  return array.length === 1 && array[0] === -1;
}

//! @note Smallest element of a sorted (ascending) array that is >= value, or null if none.
function nextGE(sortedArray, value) {
  for (let i = 0; i < sortedArray.length; ++i) {
    if (sortedArray[i] >= value) {
      return sortedArray[i];
    }
  }
  return null;
}

//! @note Pre-computes wildcard flags, membership sets and sorted field arrays once so the
//!       search loop avoids repeated isWildcard()/Array.includes()/spread work. Returns null
//!       when the schedule can never fire (empty field or an impossible day-of-month).
function compileSchedule(schedule) {
  if (!schedule.months.length
      || !schedule.mdays.length
      || !schedule.wdays.length
      || !schedule.hours.length
      || !schedule.minutes.length) {
    return null;
  }

  const monthsWild = isWildcard(schedule.months);

  if (!monthsWild) {
    let maxLimit = 0;

    for (const m of schedule.months) {
      if (m === 4 || m === 6 || m === 9 || m === 11) {
        maxLimit = Math.max(maxLimit, 30);
      } else if (m === 2) {
        maxLimit = Math.max(maxLimit, 29);
      } else {
        maxLimit = 31;
      }
    }

    let maxMday = 0;
    for (const d of schedule.mdays) {
      if (d > maxMday) {
        maxMday = d;
      }
    }

    if (maxMday > maxLimit) {
      return null;
    }
  }

  return {
    monthsWild,
    mdaysWild: isWildcard(schedule.mdays),
    wdaysWild: isWildcard(schedule.wdays),
    hoursWild: isWildcard(schedule.hours),
    minutesWild: isWildcard(schedule.minutes),
    monthSet: new Set(schedule.months),
    mdaySet: new Set(schedule.mdays),
    wdaySet: new Set(schedule.wdays),
    hourSet: new Set(schedule.hours),
    minuteSet: new Set(schedule.minutes),
    sortedHours: [...schedule.hours].sort((a, b) => a - b),
    sortedMinutes: [...schedule.minutes].sort((a, b) => a - b),
    expiresAt: schedule.expiresAt
  };
}

function predictNextExecutionCompiled(compiled, now) {
  const MAX_ITERATIONS = 2048;

  const next = now.clone();
  next.setSecond(0);
  next.addMinutes(1);

  let iterations = 0;
  while (true) {
    if (++iterations === MAX_ITERATIONS) {
      return null;
    }

    if (!compiled.monthsWild && !compiled.monthSet.has(next.month())) {
      next.addMonths(1);
      next.setDay(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if ((!compiled.mdaysWild && !compiled.wdaysWild) && (!compiled.mdaySet.has(next.day()) && !compiled.wdaySet.has(next.weekDay()))) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!compiled.mdaysWild && compiled.wdaysWild && !compiled.mdaySet.has(next.day())) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!compiled.wdaysWild && compiled.mdaysWild && !compiled.wdaySet.has(next.weekDay())) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!compiled.hoursWild && !compiled.hourSet.has(next.hour())) {
      //! @note Jump straight to the next valid hour today (or roll to the next day) instead of
      //!       stepping one hour at a time. Resetting the minute lets the minute check below pick
      //!       the first valid minute of the new hour.
      const nh = nextGE(compiled.sortedHours, next.hour());
      if (nh === null) {
        next.addDays(1);
        next.setHour(0);
        next.setMinute(0);
      } else {
        next.setHour(nh);
        next.setMinute(0);
      }
      continue;
    }

    if (!compiled.minutesWild && !compiled.minuteSet.has(next.minute())) {
      //! @note The month/day/hour are already valid at this point, so jump directly to the next
      //!       valid minute within this hour; if there is none, roll to the next hour and re-check.
      const nm = nextGE(compiled.sortedMinutes, next.minute());
      if (nm === null) {
        next.setMinute(0);
        next.addHours(1);
        continue;
      }
      next.setMinute(nm);
    }

    break;
  }

  if (compiled.expiresAt && compiled.expiresAt > 0 && next.expiryCompareVal() > compiled.expiresAt) {
    return null;
  }

  return next.clone();
}

export function predictNextExecution(schedule, now) {
  const compiled = compileSchedule(schedule);
  if (!compiled) {
    return null;
  }
  return predictNextExecutionCompiled(compiled, now);
}

export function predictNextExecutions(schedule, now, n = 3) {
  const result = [];

  const compiled = compileSchedule(schedule);
  if (!compiled) {
    return result;
  }

  for (let i = 0; i < n; ++i) {
    now = predictNextExecutionCompiled(compiled, now);
    if (!now) {
      break;
    }
    result.push(now);
  }

  return result;
}
