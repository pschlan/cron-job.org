export function calculatePercentile(values, p) {
  if (values.length === 0) {
    return -1;
  }

  if (values.length === 1) {
    return values[0];
  }

  const sortedValues = [...values].sort((a, b) => a-b);
  const rank = Math.max(0, sortedValues.length * p - 1);

  const index1 = Math.floor(rank);
  if (Math.abs(index1 - rank) < 10e-6) {
    return sortedValues[index1];
  }

  const index2 = Math.ceil(rank);
  const value1 = sortedValues[index1];
  const value2 = sortedValues[index2];
  const frac = rank - Math.floor(rank);

  return value1 + (value2 - value1) * frac;
}

export function calculateAverage(values) {
  if (values.length === 0) {
    return -1;
  }
  return values.reduce((a, b) => a + b) / values.length;
}
