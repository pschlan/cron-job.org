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
