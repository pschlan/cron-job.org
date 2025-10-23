function compressSequences(array) {
  array = [...array, -1];

  const result = [];
  let currentSequenceStart = -1;

  for (let index = 0; index < array.length; ++index) {
    const value = index === array.length ? -1 : array[index];
    const previousValue = index > 0 && array[index-1];

    if (index === 0) {
      currentSequenceStart = value;
    } else {
      if (value === -1 || value - previousValue !== 1) {
        result.push(currentSequenceStart === previousValue ? currentSequenceStart : [currentSequenceStart, previousValue]);
        currentSequenceStart = value;
      }
    }
  }

  return result;
}

function convertComponent(array, minElement, maxElement) {
  array = array.map(x => parseInt(x));
  array.sort((a, b) => a - b);

  if (array.length === 0) {
    return null;
  }

  if (array.length === 1) {
    if (array[0] === -1) {
      return '*';
    } else {
      return '' + array[0];
    }
  }

  if (array.length === (maxElement - minElement + 1)) {
    return '*';
  }

  const multiplier = array[1] - array[0];
  const multiplierValidated =
        array.reduce((prev, cur, index) => prev && (index * multiplier + minElement) === cur, true)
    &&  array.length === Math.ceil((maxElement - minElement + 1) / multiplier);
  if (multiplierValidated) {
    return '*/' + multiplier;
  }

  return compressSequences(array)
    .map(x => Array.isArray(x) ? x.join('-') : '' + x)
    .join(',');
}

export function scheduleToCrontabExpression(schedule) {
  if (!schedule) {
    return null;
  }
  const result = [
    convertComponent(schedule.minutes, 0, 59),
    convertComponent(schedule.hours, 0, 23),
    convertComponent(schedule.mdays, 1, 31),
    convertComponent(schedule.months, 1, 12),
    convertComponent(schedule.wdays, 0, 6)
  ];
  if (result.findIndex(x => x === null) !== -1) {
    return null;
  }
  return result.join(' ');
}

function isNumeric(x) {
  return /^\d+$/.test(x);
}

function parseExpressionComponent(str, minVal, maxVal) {
  if (str === '*') {
    return [-1];
  }

  const result = [];

  // */s syntax
  if (str.indexOf('/') !== -1) {
    const parts = str.split('/').map(x => x.trim());
    if (parts.length !== 2 || parts[0] !== '*' || !isNumeric(parts[1])) {
      return null;
    }

    const step = parseInt(parts[1]);
    if (step < 1) {
      return null;
    }

    for (let x = minVal; x <= maxVal; x += step) {
      result.push(x);
    }
    return result;
  }

  const elements = str.split(',').map(x => x.trim());
  for (const elem of elements) {
    if (elem.indexOf('-') !== -1) {
      const parts = elem
        .split('-')
        .map(x => x.trim())
        .filter(x => isNumeric(x))
        .map(x => parseInt(x))
        .filter(x => x >= minVal && x <= maxVal);
      if (parts.length !== 2 || parts[0] > parts[1]) {
        return null;
      }
      for (let x = parts[0]; x <= parts[1]; ++x) {
        result.push(x);
      }
    } else if (isNumeric(elem)) {
      const numVal = parseInt(elem);
      if (numVal >= minVal && numVal <= maxVal) {
        result.push(parseInt(elem));
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  return [...new Set(result)].sort();
}

export function crontabExpressionToSchedule(expr) {
  if (typeof(expr) !== 'string') {
    return null;
  }
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }
  const schedule = {
    minutes:  parseExpressionComponent(parts[0], 0, 59),
    hours:    parseExpressionComponent(parts[1], 0, 23),
    mdays:    parseExpressionComponent(parts[2], 1, 31),
    months:   parseExpressionComponent(parts[3], 1, 12),
    wdays:    parseExpressionComponent(parts[4], 0, 6)
  };
  if (Object.values(schedule).findIndex(x => x === null) !== -1) {
    return null;
  }
  return schedule;
}
