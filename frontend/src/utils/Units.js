export function formatMs(value, t, enforceMs) {
  if (value > 1000 && !enforceMs) {
    return [(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }), t('units.short.s')].join(' ');
  }
  return [value.toLocaleString(undefined, { maximumFractionDigits: 2 }), t('units.short.ms')].join(' ');
}

export function formatPercent(value, t) {
  return [(value * 100.0).toLocaleString(undefined, { maximumFractionDigits: 2 }), '%'].join(' ');
}

export function formatPercentile(p, t) {
  return ['p', (p * 100.0).toLocaleString(undefined, { maximumFractionDigits: 1 }).replace(',', '.')].join('');
}
