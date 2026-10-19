const RETRY_ATTEMPTS = 2;

const RETRYABLE_CODES = new Set([
  110600,
  110620,
  200500
]);

export function turnstileFailureAction(errorCode, attempt) {
  if (typeof errorCode !== 'number' || !Number.isFinite(errorCode)) {
    return 'fail';
  }

  const family = Math.floor(errorCode / 1000);
  const retryable = family === 300 || family === 600 || RETRYABLE_CODES.has(errorCode);
  if (retryable && attempt <= RETRY_ATTEMPTS) {
    return 'retry';
  }

  return 'fail';
}
