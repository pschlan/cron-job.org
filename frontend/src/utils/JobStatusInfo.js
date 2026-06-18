// Maps a job execution result to a short, human-readable explanation of why it
// failed and what the user can typically do about it (GitHub issue #250).
//
// The functions return an i18n token (relative to `jobs.statusExplanations.`)
// rather than a translated string so the mapping stays pure and easy to test.
// They return null when there is nothing useful to explain (e.g. a successful
// execution or an unknown status).

import { JobStatus } from './Constants';

const FAILURE_MODE_TOKENS = {
  [JobStatus.FAILED_DNS]: 'modes.FAILED_DNS',
  [JobStatus.FAILED_CONNECT]: 'modes.FAILED_CONNECT',
  [JobStatus.FAILED_TIMEOUT]: 'modes.FAILED_TIMEOUT',
  [JobStatus.FAILED_SIZE]: 'modes.FAILED_SIZE',
  [JobStatus.FAILED_URL]: 'modes.FAILED_URL',
  [JobStatus.FAILED_INTERNAL]: 'modes.FAILED_INTERNAL',
  [JobStatus.FAILED_OTHERS]: 'modes.FAILED_OTHERS',
};

// HTTP status codes that get their own dedicated explanation. Anything else
// falls back to the explanation for its class (3xx / 4xx / 5xx).
const SPECIFIC_HTTP_CODES = new Set([
  400, 401, 403, 404, 405, 429, 500, 502, 503, 504,
]);

// Returns an explanation token for a non-success HTTP status code, or null for
// 1xx/2xx (success) and anything outside the 3xx-5xx range.
export function httpStatusExplanationToken(httpStatus) {
  if (typeof httpStatus !== 'number' || !Number.isFinite(httpStatus)) {
    return null;
  }

  const httpClass = Math.floor(httpStatus / 100);

  // Redirects don't have per-code explanations; the class message covers them.
  if (httpClass === 3) {
    return 'http.3xx';
  }
  if (SPECIFIC_HTTP_CODES.has(httpStatus)) {
    return 'http.' + httpStatus;
  }
  if (httpClass === 4) {
    return 'http.4xx';
  }
  if (httpClass === 5) {
    return 'http.5xx';
  }
  return null;
}

// Returns an explanation token for a job execution result, or null when there
// is nothing to explain (success or unknown status).
//
// For an HTTP error we prefer the explanation for the concrete status code, but
// fall back to a generic message when the code isn't available (e.g. the job
// list only carries the status, not the HTTP code).
export function statusExplanationToken(status, httpStatus) {
  if (status === JobStatus.FAILED_HTTPERROR) {
    return httpStatusExplanationToken(httpStatus) || 'modes.FAILED_HTTPERROR';
  }
  return FAILURE_MODE_TOKENS[status] || null;
}
