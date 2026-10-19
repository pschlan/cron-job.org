const RETRY_ATTEMPTS = 2;

const RETRYABLE_CODES = new Set([
  110600,
  110620,
  200500
]);

function numericErrorCode(errorCode) {
  if (typeof errorCode === 'number' && Number.isInteger(errorCode)) {
    return errorCode;
  }
  if (typeof errorCode === 'string' && /^[0-9]+$/.test(errorCode)) {
    return Number(errorCode);
  }
  return null;
}

export function turnstileFailureAction(errorCode, attempt) {
  const code = numericErrorCode(errorCode);
  if (code === null) {
    return 'fail';
  }

  const family = Math.floor(code / 1000);
  const retryable = family === 300 || family === 600 || RETRYABLE_CODES.has(code);
  if (retryable && attempt <= RETRY_ATTEMPTS) {
    return 'retry';
  }

  return 'fail';
}
