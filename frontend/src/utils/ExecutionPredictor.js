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

/** Returns the smallest value in sortedArr that is >= current, or null if none (wrap to next period). */
function nextInSorted(sortedArr, current) {
  for (let i = 0; i < sortedArr.length; i++) {
    if (sortedArr[i] >= current) {
      return sortedArr[i];
    }
  }
  return null;
}

/** Build lookup sets and precomputed flags once before the main loop. */
function prepareSchedule(schedule) {
  const monthWild = isWildcard(schedule.months);
  const mdayWild = isWildcard(schedule.mdays);
  const wdayWild = isWildcard(schedule.wdays);
  const hourWild = isWildcard(schedule.hours);
  const minuteWild = isWildcard(schedule.minutes);

  const monthSet = monthWild ? null : new Set(schedule.months);
  const mdaySet = mdayWild ? null : new Set(schedule.mdays);
  const wdaySet = wdayWild ? null : new Set(schedule.wdays);
  const hourSet = hourWild ? null : new Set(schedule.hours);
  const minuteSet = minuteWild ? null : new Set(schedule.minutes);

  const sortedMonths = monthWild ? [] : [...schedule.months].sort((a, b) => a - b);
  const sortedMdays = mdayWild ? [] : [...schedule.mdays].sort((a, b) => a - b);
  const sortedWdays = wdayWild ? [] : [...schedule.wdays].sort((a, b) => a - b);
  const sortedHours = hourWild ? [] : [...schedule.hours].sort((a, b) => a - b);
  const sortedMinutes = minuteWild ? [] : [...schedule.minutes].sort((a, b) => a - b);

  return {
    monthWild, mdayWild, wdayWild, hourWild, minuteWild,
    monthSet, mdaySet, wdaySet, hourSet, minuteSet,
    sortedMonths, sortedMdays, sortedWdays, sortedHours, sortedMinutes,
    firstMonth: sortedMonths[0],
    firstMday: sortedMdays[0],
    firstWday: sortedWdays[0],
    firstHour: sortedHours[0],
    firstMinute: sortedMinutes[0]
  };
}

export function predictNextExecution(schedule, now) {
  const MAX_ITERATIONS = 2048;

  if (!schedule.months.length
      || !schedule.mdays.length
      || !schedule.wdays.length
      || !schedule.hours.length
      || !schedule.minutes.length) {
    return null;
  }

  if (!isWildcard(schedule.months)) {
    let maxLimit = 0;

    for (const m of schedule.months) {
      if ([4, 6, 9, 11].includes(m)) {
        maxLimit = Math.max(maxLimit, 30);
      } else if (m === 2) {
        maxLimit = Math.max(maxLimit, 29);
      } else {
        maxLimit = 31;
      }
    }

    if (Math.max(...schedule.mdays) > maxLimit) {
      return null;
    }
  }

  const s = prepareSchedule(schedule);
  const next = now.clone();
  next.setSecond(0);
  next.addMinutes(1);

  let iterations = 0;
  while (true) {
    if (++iterations === MAX_ITERATIONS) {
      return null;
    }

    if (!s.monthWild && !s.monthSet.has(next.month())) {
      const n = nextInSorted(s.sortedMonths, next.month());
      if (n !== null) {
        next.setDay(1);
        next.setHour(0);
        next.setMinute(0);
        next.addMonths(n - next.month());
      } else {
        next.addMonths(1);
        next.setDay(1);
        next.setHour(0);
        next.setMinute(0);
        const delta = (s.firstMonth - next.month() + 12) % 12;
        if (delta > 0) {
          next.addMonths(delta);
        }
      }
      continue;
    }

    const mdayOk = s.mdayWild || s.mdaySet.has(next.day());
    const wdayOk = s.wdayWild || s.wdaySet.has(next.weekDay());
    if (!s.mdayWild && !s.wdayWild && !mdayOk && !wdayOk) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!s.mdayWild && s.wdayWild && !mdayOk) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!s.wdayWild && s.mdayWild && !wdayOk) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!s.hourWild && !s.hourSet.has(next.hour())) {
      const n = nextInSorted(s.sortedHours, next.hour());
      if (n !== null) {
        next.setMinute(0);
        next.addHours(n - next.hour());
      } else {
        next.addDays(1);
        next.setHour(s.firstHour);
        next.setMinute(0);
      }
      continue;
    }

    if (!s.minuteWild && !s.minuteSet.has(next.minute())) {
      const n = nextInSorted(s.sortedMinutes, next.minute());
      if (n !== null) {
        next.addMinutes(n - next.minute());
      } else {
        next.addHours(1);
        next.setMinute(s.firstMinute);
      }
      continue;
    }

    break;
  }

  if (schedule.expiresAt && schedule.expiresAt > 0 && next.expiryCompareVal() > schedule.expiresAt) {
    return null;
  }

  return next.clone();
}

export function predictNextExecutions(schedule, now, n = 3) {
  const result = [];

  for (let i = 0; i < n; ++i) {
    now = predictNextExecution(schedule, now);
    if (!now) {
      break;
    }
    result.push(now);
  }

  return result;
}
