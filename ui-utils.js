export function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  let normalized = Math.floor(value);

  if (typeof min === 'number' && normalized < min) {
    normalized = min;
  }

  if (typeof max === 'number' && normalized > max) {
    normalized = max;
  }

  return normalized;
}

export function formatPct(value) {
  return `${(value * 100).toFixed(5)}%`;
}

export function formatNum(value) {
  return value.toLocaleString('ko-KR');
}

export function formatMultiplier(multiplier) {
  const rounded = Math.round((multiplier ?? 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toString();
}

export function formatDateTime(timestamp) {
  if (typeof timestamp !== 'number') {
    return '-';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', { hour12: false });
}
