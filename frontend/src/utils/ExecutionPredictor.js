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

  const next = now.clone();
  next.setSecond(0);
  next.addMinutes(1);

  let iterations = 0;
  while (true) {
    if (++iterations === MAX_ITERATIONS) {
      return null;
    }

    if (!isWildcard(schedule.months) && !schedule.months.includes(next.month())) {
      next.addMonths(1);
      next.setDay(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!isWildcard(schedule.mdays) && !schedule.mdays.includes(next.day())) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!isWildcard(schedule.wdays) && !schedule.wdays.includes(next.weekDay())) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!isWildcard(schedule.hours) && !schedule.hours.includes(next.hour())) {
      next.setMinute(0);
      next.addHours(1);
      continue;
    }

    if (!isWildcard(schedule.minutes) && !schedule.minutes.includes(next.minute())) {
      next.addMinutes(1);
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
