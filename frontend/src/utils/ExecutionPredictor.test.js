import moment from 'moment';
import { ExecutionDate, predictNextExecution, predictNextExecutions } from './ExecutionPredictor';

const WILDCARD = [-1];

//! @note Build a schedule, defaulting every unspecified field to the wildcard.
function schedule(overrides = {}) {
  return {
    months:  WILDCARD,
    mdays:   WILDCARD,
    wdays:   WILDCARD,
    hours:   WILDCARD,
    minutes: WILDCARD,
    ...overrides
  };
}

//! @note An ExecutionDate anchored at a fixed UTC wall-clock time.
function at(isoUtc) {
  return new ExecutionDate(moment.utc(isoUtc));
}

function fmt(executionDate) {
  return executionDate ? executionDate.format('YYYY-MM-DD HH:mm') : null;
}

describe('predictNextExecution', () => {
  it('advances to the next minute for an all-wildcard schedule', () => {
    expect(fmt(predictNextExecution(schedule(), at('2026-01-01T00:00:00'))))
      .toBe('2026-01-01 00:01');
  });

  it('always moves at least one minute into the future (never returns "now")', () => {
    expect(fmt(predictNextExecution(schedule(), at('2026-01-01T12:34:59'))))
      .toBe('2026-01-01 12:35');
  });

  it('jumps to the next matching minute within the same hour', () => {
    const sched = schedule({ minutes: [0, 15, 30, 45] });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T00:01:00'))))
      .toBe('2026-01-01 00:15');
  });

  it('rolls over to the next hour when no matching minute remains', () => {
    const sched = schedule({ minutes: [0, 15, 30, 45] });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T00:50:00'))))
      .toBe('2026-01-01 01:00');
  });

  it('rolls over across midnight when no matching minute remains in the day', () => {
    const sched = schedule({ minutes: [0, 15, 30, 45] });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T23:50:00'))))
      .toBe('2026-01-02 00:00');
  });

  it('handles a daily fixed time later the same day', () => {
    const sched = schedule({ hours: [8], minutes: [30] });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T07:00:00'))))
      .toBe('2026-01-01 08:30');
  });

  it('handles a daily fixed time that has already passed today', () => {
    const sched = schedule({ hours: [8], minutes: [30] });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T09:00:00'))))
      .toBe('2026-01-02 08:30');
  });

  it('handles a monthly schedule (specific day of month)', () => {
    const sched = schedule({ mdays: [15], hours: [0], minutes: [0] });
    expect(fmt(predictNextExecution(sched, at('2026-01-10T00:00:00'))))
      .toBe('2026-01-15 00:00');
  });

  it('rolls to the next month when the day of month has passed', () => {
    const sched = schedule({ mdays: [15], hours: [0], minutes: [0] });
    expect(fmt(predictNextExecution(sched, at('2026-01-20T00:00:00'))))
      .toBe('2026-02-15 00:00');
  });

  it('handles a once-a-year schedule crossing the year boundary', () => {
    const sched = schedule({ months: [3], mdays: [20], hours: [12], minutes: [0] });
    expect(fmt(predictNextExecution(sched, at('2026-05-01T00:00:00'))))
      .toBe('2027-03-20 12:00');
  });

  it('applies day-of-month OR day-of-week semantics when both are set', () => {
    const sched = schedule({ mdays: [1], wdays: [3], hours: [0], minutes: [0] });
    const result = predictNextExecution(sched, at('2026-06-10T00:00:00'));
    expect(result).not.toBeNull();
    expect(result.day() === 1 || result.weekDay() === 3).toBe(true);
  });

  it('matches on day of week only when day of month is wildcard', () => {
    const sched = schedule({ wdays: [1], hours: [0], minutes: [0] });
    const result = predictNextExecution(sched, at('2026-06-10T00:00:00'));
    expect(result.weekDay()).toBe(1);
  });

  it('matches on day of month only when day of week is wildcard', () => {
    const sched = schedule({ mdays: [10], hours: [0], minutes: [0] });
    const result = predictNextExecution(sched, at('2026-06-15T00:00:00'));
    expect(result.day()).toBe(10);
  });

  it('returns null for an impossible day-of-month/month combination', () => {
    const sched = schedule({ months: [2], mdays: [30], hours: [0], minutes: [0] });
    expect(predictNextExecution(sched, at('2026-01-01T00:00:00'))).toBeNull();
  });

  it('resolves Feb 29 to the next actual leap year', () => {
    const sched = schedule({ months: [2], mdays: [29], hours: [0], minutes: [0] });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T00:00:00'))))
      .toBe('2028-02-29 00:00');
  });

  it('returns null when the next execution is past the expiry', () => {
    const sched = schedule({
      hours: [0], minutes: [0],
      expiresAt: 20250101000000 // 2025-01-01 00:00, already in the past
    });
    expect(predictNextExecution(sched, at('2026-01-01T00:00:00'))).toBeNull();
  });

  it('returns a value when the next execution is before the expiry', () => {
    const sched = schedule({
      hours: [0], minutes: [0],
      expiresAt: 20990101000000 // far future
    });
    expect(fmt(predictNextExecution(sched, at('2026-01-01T12:00:00'))))
      .toBe('2026-01-02 00:00');
  });

  it('returns null when any field array is empty', () => {
    expect(predictNextExecution(schedule({ minutes: [] }), at('2026-01-01T00:00:00'))).toBeNull();
    expect(predictNextExecution(schedule({ hours: [] }), at('2026-01-01T00:00:00'))).toBeNull();
    expect(predictNextExecution(schedule({ months: [] }), at('2026-01-01T00:00:00'))).toBeNull();
  });
});

describe('predictNextExecutions', () => {
  it('returns n strictly increasing executions', () => {
    const sched = schedule({ minutes: [0, 15, 30, 45] });
    const results = predictNextExecutions(sched, at('2026-01-01T00:00:00'), 3);
    expect(results.map(fmt)).toEqual([
      '2026-01-01 00:15',
      '2026-01-01 00:30',
      '2026-01-01 00:45'
    ]);
    for (let i = 1; i < results.length; ++i) {
      expect(results[i].time.valueOf()).toBeGreaterThan(results[i - 1].time.valueOf());
    }
  });

  it('stops early and returns an empty array for an unschedulable schedule', () => {
    expect(predictNextExecutions(schedule({ minutes: [] }), at('2026-01-01T00:00:00'), 5)).toEqual([]);
  });

  it('stops early once the expiry is reached', () => {
    const sched = schedule({
      hours: [0], minutes: [0],
      expiresAt: 20260103000000 // only Jan 2 and Jan 3 fit
    });
    const results = predictNextExecutions(sched, at('2026-01-01T12:00:00'), 5);
    expect(results.map(fmt)).toEqual([
      '2026-01-02 00:00',
      '2026-01-03 00:00'
    ]);
  });
});

//
// Behavior-equivalence fuzz test: the optimized implementation must produce
// identical results to the original (naive) algorithm for every schedule/now.
//

function isWildcard(array) {
  return array.length === 1 && array[0] === -1;
}

//! @note Verbatim copy of the original single-unit-stepping predictor, kept as an oracle.
function referencePredict(sched, now) {
  const MAX_ITERATIONS = 2048;

  if (!sched.months.length
      || !sched.mdays.length
      || !sched.wdays.length
      || !sched.hours.length
      || !sched.minutes.length) {
    return null;
  }

  if (!isWildcard(sched.months)) {
    let maxLimit = 0;
    for (const m of sched.months) {
      if ([4, 6, 9, 11].includes(m)) {
        maxLimit = Math.max(maxLimit, 30);
      } else if (m === 2) {
        maxLimit = Math.max(maxLimit, 29);
      } else {
        maxLimit = 31;
      }
    }
    if (Math.max(...sched.mdays) > maxLimit) {
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

    if (!isWildcard(sched.months) && !sched.months.includes(next.month())) {
      next.addMonths(1);
      next.setDay(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if ((!isWildcard(sched.mdays) && !isWildcard(sched.wdays)) && (!sched.mdays.includes(next.day()) && !sched.wdays.includes(next.weekDay()))) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!isWildcard(sched.mdays) && isWildcard(sched.wdays) && !sched.mdays.includes(next.day())) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!isWildcard(sched.wdays) && isWildcard(sched.mdays) && !sched.wdays.includes(next.weekDay())) {
      next.addDays(1);
      next.setHour(0);
      next.setMinute(0);
      continue;
    }

    if (!isWildcard(sched.hours) && !sched.hours.includes(next.hour())) {
      next.setMinute(0);
      next.addHours(1);
      continue;
    }

    if (!isWildcard(sched.minutes) && !sched.minutes.includes(next.minute())) {
      next.addMinutes(1);
      continue;
    }

    break;
  }

  if (sched.expiresAt && sched.expiresAt > 0 && next.expiryCompareVal() > sched.expiresAt) {
    return null;
  }

  return next.clone();
}

//! @note Deterministic PRNG so failures are reproducible.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('predictNextExecution equivalence with the original algorithm', () => {
  it('matches the reference implementation across many random schedules', () => {
    const rand = mulberry32(0x1234abcd);
    const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

    //! @note Either a wildcard, or a random non-empty subset of [min, max].
    const randField = (min, max) => {
      if (rand() < 0.35) {
        return WILDCARD;
      }
      const values = [];
      for (let v = min; v <= max; ++v) {
        if (rand() < 0.4) {
          values.push(v);
        }
      }
      if (!values.length) {
        values.push(randInt(min, max));
      }
      return values;
    };

    const baseMs = Date.UTC(2020, 0, 1, 0, 0, 0);
    const CASES = 3000;

    for (let i = 0; i < CASES; ++i) {
      const sched = {
        months:  randField(1, 12),
        mdays:   randField(1, 31),
        wdays:   randField(0, 6),
        hours:   randField(0, 23),
        minutes: randField(0, 59),
        expiresAt: rand() < 0.2
          ? baseMs // placeholder replaced below
          : 0
      };

      // Give a realistic YYYYMMDDHHmm00 expiry when requested.
      if (sched.expiresAt !== 0) {
        const expYear = randInt(2020, 2030);
        sched.expiresAt = expYear * 10000000000
          + randInt(1, 12) * 100000000
          + randInt(1, 28) * 1000000
          + randInt(0, 23) * 10000
          + randInt(0, 59) * 100;
      }

      const nowMs = baseMs + randInt(0, 8 * 365 * 24 * 60) * 60000;
      const now = new ExecutionDate(moment.utc(nowMs));

      const expected = referencePredict(sched, now);
      const actual = predictNextExecution(sched, now);

      if (fmt(expected) !== fmt(actual)) {
        throw new Error(
          `Mismatch for schedule ${JSON.stringify(sched)} at ${now.format('YYYY-MM-DD HH:mm')}: `
          + `expected ${fmt(expected)}, got ${fmt(actual)}`
        );
      }
    }
  });
});

//
// Micro-benchmark: measure the average runtime of the original vs. the optimized
// predictor over the same set of random cases. This is informational only (it just
// prints numbers and asserts both produced work), not a strict performance gate.
//

//! @note Same random field generator as the equivalence test, extracted so the benchmark
//!       exercises a representative mix of wildcard and sparse schedules.
function makeCaseFactory(seed) {
  const rand = mulberry32(seed);
  const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
  const randField = (min, max) => {
    if (rand() < 0.35) {
      return WILDCARD;
    }
    const values = [];
    for (let v = min; v <= max; ++v) {
      if (rand() < 0.4) {
        values.push(v);
      }
    }
    if (!values.length) {
      values.push(randInt(min, max));
    }
    return values;
  };

  const baseMs = Date.UTC(2020, 0, 1, 0, 0, 0);

  return () => {
    let expiresAt = 0;
    if (rand() < 0.2) {
      expiresAt = randInt(2020, 2030) * 10000000000
        + randInt(1, 12) * 100000000
        + randInt(1, 28) * 1000000
        + randInt(0, 23) * 10000
        + randInt(0, 59) * 100;
    }

    const sched = {
      months:  randField(1, 12),
      mdays:   randField(1, 31),
      wdays:   randField(0, 6),
      hours:   randField(0, 23),
      minutes: randField(0, 59),
      expiresAt
    };

    const nowMs = baseMs + randInt(0, 8 * 365 * 24 * 60) * 60000;
    return { sched, now: new ExecutionDate(moment.utc(nowMs)) };
  };
}

describe('predictNextExecution performance', () => {
  it('reports the average runtime of the original vs. the optimized algorithm', () => {
    const CASES = 3000;
    const RUNS = 5;

    const nextCase = makeCaseFactory(0xC0FFEE);
    const cases = [];
    for (let i = 0; i < CASES; ++i) {
      cases.push(nextCase());
    }

    //! @note Runs `predict` over every case and returns the elapsed milliseconds.
    //!       The accumulator/return of a value keeps the JIT from eliminating the calls.
    const timeAll = (predict) => {
      const start = performance.now();
      let checksum = 0;
      for (let i = 0; i < cases.length; ++i) {
        const r = predict(cases[i].sched, cases[i].now);
        if (r) {
          checksum += r.time.valueOf();
        }
      }
      const elapsed = performance.now() - start;
      return { elapsed, checksum };
    };

    // Warm up both implementations (JIT) before measuring.
    timeAll(referencePredict);
    timeAll(predictNextExecution);

    let oldTotal = 0;
    let newTotal = 0;
    let oldChecksum = 0;
    let newChecksum = 0;

    for (let run = 0; run < RUNS; ++run) {
      const oldRun = timeAll(referencePredict);
      const newRun = timeAll(predictNextExecution);
      oldTotal += oldRun.elapsed;
      newTotal += newRun.elapsed;
      oldChecksum = oldRun.checksum;
      newChecksum = newRun.checksum;
    }

    const oldAvgRun = oldTotal / RUNS;
    const newAvgRun = newTotal / RUNS;
    const oldPerCallUs = (oldAvgRun / CASES) * 1000;
    const newPerCallUs = (newAvgRun / CASES) * 1000;
    const speedup = oldAvgRun / newAvgRun;

    /* eslint-disable no-console */
    console.log(
      `\nExecutionPredictor benchmark (${CASES} random schedules x ${RUNS} runs):\n`
      + `  original : ${oldAvgRun.toFixed(2)} ms/run  (${oldPerCallUs.toFixed(3)} us/call)\n`
      + `  optimized: ${newAvgRun.toFixed(2)} ms/run  (${newPerCallUs.toFixed(3)} us/call)\n`
      + `  speedup  : ${speedup.toFixed(2)}x\n`
    );
    /* eslint-enable no-console */

    // Sanity: both implementations processed the identical workload.
    expect(newChecksum).toBe(oldChecksum);
    expect(newAvgRun).toBeGreaterThan(0);
  });

  it('reports the runtime on deliberately sparse (worst-case) schedules', () => {
    //! @note These are the cases where single-unit stepping degrades: the original walks many
    //!       minutes/hours/days while the optimized version jumps straight to the next match.
    const worstCases = [
      { name: 'minute 59 only',            sched: schedule({ minutes: [59] }),                                          now: at('2026-01-01T00:00:00') },
      { name: 'hour 23 + minute 59',       sched: schedule({ hours: [23], minutes: [59] }),                             now: at('2026-01-01T00:00:00') },
      { name: 'last minute of last hour',  sched: schedule({ hours: [23], minutes: [59], mdays: [28] }),                now: at('2026-01-01T00:00:00') },
      { name: 'Feb 29 (multi-year search)',sched: schedule({ months: [2], mdays: [29], hours: [0], minutes: [0] }),     now: at('2026-03-01T00:00:00') },
      { name: 'single yearly instant',     sched: schedule({ months: [12], mdays: [31], hours: [23], minutes: [59] }),  now: at('2026-01-01T00:00:00') }
    ];

    const ITERATIONS = 3000;

    //! @note Repeatedly predicts for a single case; returns elapsed ms and a checksum.
    const timeCase = (predict, sched, now) => {
      const start = performance.now();
      let checksum = 0;
      for (let i = 0; i < ITERATIONS; ++i) {
        const r = predict(sched, now);
        if (r) {
          checksum += r.time.valueOf();
        }
      }
      return { elapsed: performance.now() - start, checksum };
    };

    // Warm up.
    for (const c of worstCases) {
      timeCase(referencePredict, c.sched, c.now);
      timeCase(predictNextExecution, c.sched, c.now);
    }

    const lines = [];
    let oldTotal = 0;
    let newTotal = 0;

    for (const c of worstCases) {
      const oldRun = timeCase(referencePredict, c.sched, c.now);
      const newRun = timeCase(predictNextExecution, c.sched, c.now);

      // Both must still agree on the result for these cases.
      expect(newRun.checksum).toBe(oldRun.checksum);

      oldTotal += oldRun.elapsed;
      newTotal += newRun.elapsed;

      const oldUs = (oldRun.elapsed / ITERATIONS) * 1000;
      const newUs = (newRun.elapsed / ITERATIONS) * 1000;
      lines.push(
        `  ${c.name.padEnd(28)} original ${oldUs.toFixed(2).padStart(7)} us/call`
        + ` | optimized ${newUs.toFixed(2).padStart(7)} us/call`
        + ` | ${(oldRun.elapsed / newRun.elapsed).toFixed(2)}x`
      );
    }

    /* eslint-disable no-console */
    console.log(
      `\nExecutionPredictor worst-case benchmark (${ITERATIONS} calls each):\n`
      + lines.join('\n') + '\n'
      + `  overall speedup: ${(oldTotal / newTotal).toFixed(2)}x\n`
    );
    /* eslint-enable no-console */

    expect(newTotal).toBeGreaterThan(0);
  });
});
