import {
  ExecutionDate,
  predictNextExecution,
  predictNextExecutions
} from './ExecutionPredictor';

/**
 * Create an ExecutionDate representing the given UTC-like Y,M,D,h,m.
 * Uses local Date constructor so fromDate()'s getFullYear/getHours etc. yield these values,
 * which moment.utc() then interprets as UTC. Ensures tests are timezone-independent.
 */
function makeDate(year, month, day, hour = 0, minute = 0) {
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return ExecutionDate.fromDate(d);
}

describe('ExecutionDate', () => {
  describe('fromDate', () => {
    it('creates UTC moment from Date (uses local getters, so pass local Date for deterministic UTC)', () => {
      const d = new Date(2025, 0, 15, 14, 30, 0, 0);
      const ed = ExecutionDate.fromDate(d);
      expect(ed.year()).toBe(2025);
      expect(ed.month()).toBe(1);
      expect(ed.day()).toBe(15);
      expect(ed.hour()).toBe(14);
      expect(ed.minute()).toBe(30);
    });
  });

  describe('addMinutes / addHours / addDays / addMonths', () => {
    it('addMinutes advances time', () => {
      const ed = makeDate(2025, 1, 1, 0, 0);
      ed.addMinutes(90);
      expect(ed.hour()).toBe(1);
      expect(ed.minute()).toBe(30);
    });

    it('addHours advances time', () => {
      const ed = makeDate(2025, 1, 1, 22, 0);
      ed.addHours(3);
      expect(ed.day()).toBe(2);
      expect(ed.hour()).toBe(1);
    });

    it('addDays advances date', () => {
      const ed = makeDate(2025, 1, 31, 0, 0);
      ed.addDays(1);
      expect(ed.month()).toBe(2);
      expect(ed.day()).toBe(1);
    });

    it('addMonths advances month', () => {
      const ed = makeDate(2025, 1, 15, 0, 0);
      ed.addMonths(2);
      expect(ed.month()).toBe(3);
      expect(ed.day()).toBe(15);
    });
  });

  describe('getters', () => {
    it('month returns 1-12', () => {
      const ed = makeDate(2025, 3, 1);
      expect(ed.month()).toBe(3);
    });

    it('weekDay returns 0-6 (Sunday-Saturday)', () => {
      const ed = makeDate(2025, 1, 6); // Monday
      expect(ed.weekDay()).toBe(1);
    });
  });

  describe('expiryCompareVal', () => {
    it('returns comparable number (year*1e10 + month*1e8 + day*1e6 + hour*1e4 + minute*100)', () => {
      const ed = makeDate(2025, 6, 15, 14, 30);
      const v = ed.expiryCompareVal();
      expect(v).toBe(20250615143000);
    });
  });

  describe('setters', () => {
    it('setDay/setHour/setMinute/setSecond update time', () => {
      const ed = makeDate(2025, 1, 1, 0, 0);
      ed.setDay(15);
      ed.setHour(12);
      ed.setMinute(45);
      ed.setSecond(30);
      expect(ed.day()).toBe(15);
      expect(ed.hour()).toBe(12);
      expect(ed.minute()).toBe(45);
      expect(ed.second()).toBe(30);
    });
  });

  describe('format', () => {
    it('formats using moment pattern', () => {
      const ed = makeDate(2025, 1, 15, 14, 30);
      expect(ed.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 14:30');
    });
  });

  describe('clone', () => {
    it('returns independent copy', () => {
      const ed = makeDate(2025, 1, 1, 12, 0);
      const clone = ed.clone();
      ed.addHours(1);
      expect(clone.hour()).toBe(12);
      expect(ed.hour()).toBe(13);
    });
  });
});

/** Wildcard schedule: every minute. */
const everyMinute = {
  months: [-1],
  mdays: [-1],
  wdays: [-1],
  hours: [-1],
  minutes: [-1]
};

describe('predictNextExecution', () => {
  describe('invalid schedule', () => {
    it('returns null when any field is empty', () => {
      expect(predictNextExecution({ months: [], mdays: [-1], wdays: [-1], hours: [-1], minutes: [-1] }, makeDate(2025, 1, 1))).toBe(null);
      expect(predictNextExecution({ months: [-1], mdays: [], wdays: [-1], hours: [-1], minutes: [-1] }, makeDate(2025, 1, 1))).toBe(null);
      expect(predictNextExecution({ months: [-1], mdays: [-1], wdays: [], hours: [-1], minutes: [-1] }, makeDate(2025, 1, 1))).toBe(null);
      expect(predictNextExecution({ months: [-1], mdays: [-1], wdays: [-1], hours: [], minutes: [-1] }, makeDate(2025, 1, 1))).toBe(null);
      expect(predictNextExecution({ months: [-1], mdays: [-1], wdays: [-1], hours: [-1], minutes: [] }, makeDate(2025, 1, 1))).toBe(null);
    });

    it('returns null when month-day exceeds month limit', () => {
      const schedule = { months: [2], mdays: [31], wdays: [-1], hours: [0], minutes: [0] };
      expect(predictNextExecution(schedule, makeDate(2025, 1, 1))).toBe(null);
    });
  });

  describe('wildcard schedule (every minute)', () => {
    it('returns now + 1 minute (seconds zeroed)', () => {
      const now = makeDate(2025, 1, 15, 14, 30);
      const next = predictNextExecution(everyMinute, now);
      expect(next).not.toBe(null);
      expect(next.year()).toBe(2025);
      expect(next.month()).toBe(1);
      expect(next.day()).toBe(15);
      expect(next.hour()).toBe(14);
      expect(next.minute()).toBe(31);
      expect(next.second()).toBe(0);
    });
  });

  describe('specific minutes only', () => {
    it('advances to next scheduled minute in same hour', () => {
      const schedule = { months: [-1], mdays: [-1], wdays: [-1], hours: [-1], minutes: [0, 15, 30, 45] };
      const now = makeDate(2025, 1, 1, 12, 10);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.hour()).toBe(12);
      expect(next.minute()).toBe(15);
    });

    it('wraps to next hour when no minute in current hour', () => {
      const schedule = { months: [-1], mdays: [-1], wdays: [-1], hours: [-1], minutes: [0, 30] };
      const now = makeDate(2025, 1, 1, 12, 45);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.hour()).toBe(13);
      expect(next.minute()).toBe(0);
    });
  });

  describe('specific hours only', () => {
    it('advances to next scheduled hour', () => {
      const schedule = { months: [-1], mdays: [-1], wdays: [-1], hours: [8, 12, 18], minutes: [0] };
      const now = makeDate(2025, 1, 1, 10, 0);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.hour()).toBe(12);
      expect(next.minute()).toBe(0);
    });

    it('wraps to next day when no hour in current day', () => {
      const schedule = { months: [-1], mdays: [-1], wdays: [-1], hours: [8], minutes: [0] };
      const now = makeDate(2025, 1, 1, 10, 0);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.day()).toBe(2);
      expect(next.hour()).toBe(8);
    });
  });

  describe('specific month-days', () => {
    it('advances to next scheduled day of month', () => {
      const schedule = { months: [-1], mdays: [1, 15], wdays: [-1], hours: [0], minutes: [0] };
      const now = makeDate(2025, 1, 10, 0, 0);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.day()).toBe(15);
    });

    it('wraps to next month when no day in current month', () => {
      const schedule = { months: [-1], mdays: [1, 15], wdays: [-1], hours: [0], minutes: [0] };
      const now = makeDate(2025, 1, 20, 0, 0);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.month()).toBe(2);
      expect(next.day()).toBe(1);
    });
  });

  describe('specific week-days', () => {
    it('advances to next scheduled week-day', () => {
      const schedule = { months: [-1], mdays: [-1], wdays: [1, 3, 5], hours: [9], minutes: [0] };
      const now = makeDate(2025, 1, 6, 8, 0); // Monday Jan 6, 08:00
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.weekDay()).toBe(1);
      expect(next.hour()).toBe(9);
      expect(next.day()).toBe(6);
    });
  });

  describe('specific months', () => {
    it('advances to next scheduled month', () => {
      const schedule = { months: [3, 6, 9], mdays: [1], wdays: [-1], hours: [0], minutes: [0] };
      const now = makeDate(2025, 1, 15, 0, 0);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.month()).toBe(3);
      expect(next.day()).toBe(1);
    });
  });

  describe('expiresAt', () => {
    it('returns null when next execution is after expiry', () => {
      const schedule = {
        months: [-1],
        mdays: [-1],
        wdays: [-1],
        hours: [-1],
        minutes: [0, 30],
        expiresAt: 202501011200 // 2025-01-01 12:00
      };
      const now = makeDate(2025, 1, 1, 12, 45);
      const next = predictNextExecution(schedule, now);
      expect(next).toBe(null);
    });

    it('returns next execution when before expiry', () => {
      const schedule = {
        months: [-1],
        mdays: [-1],
        wdays: [-1],
        hours: [-1],
        minutes: [0, 30],
        expiresAt: 20250101140000 // 2025-01-01 14:00 (same format as expiryCompareVal)
      };
      const now = makeDate(2025, 1, 1, 12, 45);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.hour()).toBe(13);
      expect(next.minute()).toBe(0);
      expect(next.expiryCompareVal()).toBeLessThanOrEqual(schedule.expiresAt);
    });
  });

  describe('combined constraints', () => {
    it('respects month + day + hour + minute', () => {
      const schedule = {
        months: [6],
        mdays: [15],
        wdays: [-1],
        hours: [14],
        minutes: [0, 30]
      };
      const now = makeDate(2025, 6, 15, 14, 10);
      const next = predictNextExecution(schedule, now);
      expect(next).not.toBe(null);
      expect(next.month()).toBe(6);
      expect(next.day()).toBe(15);
      expect(next.hour()).toBe(14);
      expect(next.minute()).toBe(30);
    });
  });
});

describe('predictNextExecutions', () => {
  it('returns n next executions when schedule has no expiry', () => {
    const schedule = { months: [-1], mdays: [-1], wdays: [-1], hours: [-1], minutes: [0, 15, 30, 45] };
    const now = makeDate(2025, 1, 1, 12, 0);
    const results = predictNextExecutions(schedule, now, 4);
    expect(results).toHaveLength(4);
    expect(results[0].minute()).toBe(15);
    expect(results[1].minute()).toBe(30);
    expect(results[2].minute()).toBe(45);
    expect(results[3].minute()).toBe(0);
    expect(results[3].hour()).toBe(13);
  });

  it('returns fewer than n when schedule expires', () => {
    const schedule = {
      months: [-1],
      mdays: [-1],
      wdays: [-1],
      hours: [-1],
      minutes: [0, 30],
      expiresAt: 202501011301
    };
    const now = makeDate(2025, 1, 1, 12, 45);
    const results = predictNextExecutions(schedule, now, 5);
    expect(results.length).toBeLessThanOrEqual(5);
    results.forEach((r, i) => {
      expect(r.expiryCompareVal()).toBeLessThanOrEqual(schedule.expiresAt);
    });
  });

  it('defaults n to 3', () => {
    const results = predictNextExecutions(everyMinute, makeDate(2025, 1, 1, 0, 0));
    expect(results).toHaveLength(3);
  });

  it('stops when predictNextExecution returns null', () => {
    const invalidSchedule = { months: [], mdays: [-1], wdays: [-1], hours: [-1], minutes: [-1] };
    const results = predictNextExecutions(invalidSchedule, makeDate(2025, 1, 1), 5);
    expect(results).toHaveLength(0);
  });
});
