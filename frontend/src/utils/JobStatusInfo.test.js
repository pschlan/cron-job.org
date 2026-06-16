import { httpStatusExplanationToken, statusExplanationToken } from './JobStatusInfo';
import { JobStatus } from './Constants';

describe('httpStatusExplanationToken', () => {
  it('returns null for successful (2xx) and informational (1xx) codes', () => {
    expect(httpStatusExplanationToken(100)).toBeNull();
    expect(httpStatusExplanationToken(200)).toBeNull();
    expect(httpStatusExplanationToken(204)).toBeNull();
  });

  it('returns the class token for any redirect code', () => {
    expect(httpStatusExplanationToken(301)).toBe('http.3xx');
    expect(httpStatusExplanationToken(302)).toBe('http.3xx');
    expect(httpStatusExplanationToken(307)).toBe('http.3xx');
    expect(httpStatusExplanationToken(308)).toBe('http.3xx');
  });

  it('returns a dedicated token for well-known client errors', () => {
    expect(httpStatusExplanationToken(400)).toBe('http.400');
    expect(httpStatusExplanationToken(401)).toBe('http.401');
    expect(httpStatusExplanationToken(403)).toBe('http.403');
    expect(httpStatusExplanationToken(404)).toBe('http.404');
    expect(httpStatusExplanationToken(405)).toBe('http.405');
    expect(httpStatusExplanationToken(429)).toBe('http.429');
  });

  it('returns a dedicated token for well-known server errors', () => {
    expect(httpStatusExplanationToken(500)).toBe('http.500');
    expect(httpStatusExplanationToken(502)).toBe('http.502');
    expect(httpStatusExplanationToken(503)).toBe('http.503');
    expect(httpStatusExplanationToken(504)).toBe('http.504');
  });

  it('falls back to the class token for other 4xx/5xx codes', () => {
    expect(httpStatusExplanationToken(402)).toBe('http.4xx');
    expect(httpStatusExplanationToken(418)).toBe('http.4xx');
    expect(httpStatusExplanationToken(451)).toBe('http.4xx');
    expect(httpStatusExplanationToken(501)).toBe('http.5xx');
    expect(httpStatusExplanationToken(599)).toBe('http.5xx');
  });

  it('returns null for out-of-range or non-numeric input', () => {
    expect(httpStatusExplanationToken(0)).toBeNull();
    expect(httpStatusExplanationToken(600)).toBeNull();
    expect(httpStatusExplanationToken(NaN)).toBeNull();
    expect(httpStatusExplanationToken(undefined)).toBeNull();
    expect(httpStatusExplanationToken(null)).toBeNull();
    expect(httpStatusExplanationToken('404')).toBeNull();
  });
});

describe('statusExplanationToken', () => {
  it('returns null for successful and unknown executions', () => {
    expect(statusExplanationToken(JobStatus.OK, 200)).toBeNull();
    expect(statusExplanationToken(JobStatus.UNKNOWN, 0)).toBeNull();
  });

  it('maps each non-HTTP failure mode to its token', () => {
    expect(statusExplanationToken(JobStatus.FAILED_DNS)).toBe('modes.FAILED_DNS');
    expect(statusExplanationToken(JobStatus.FAILED_CONNECT)).toBe('modes.FAILED_CONNECT');
    expect(statusExplanationToken(JobStatus.FAILED_TIMEOUT)).toBe('modes.FAILED_TIMEOUT');
    expect(statusExplanationToken(JobStatus.FAILED_SIZE)).toBe('modes.FAILED_SIZE');
    expect(statusExplanationToken(JobStatus.FAILED_URL)).toBe('modes.FAILED_URL');
    expect(statusExplanationToken(JobStatus.FAILED_INTERNAL)).toBe('modes.FAILED_INTERNAL');
    expect(statusExplanationToken(JobStatus.FAILED_OTHERS)).toBe('modes.FAILED_OTHERS');
  });

  it('delegates HTTP errors to the HTTP code explanation', () => {
    expect(statusExplanationToken(JobStatus.FAILED_HTTPERROR, 404)).toBe('http.404');
    expect(statusExplanationToken(JobStatus.FAILED_HTTPERROR, 418)).toBe('http.4xx');
    expect(statusExplanationToken(JobStatus.FAILED_HTTPERROR, 503)).toBe('http.503');
    expect(statusExplanationToken(JobStatus.FAILED_HTTPERROR, 302)).toBe('http.3xx');
  });

  it('falls back to a generic HTTP-error explanation when no usable status code is available', () => {
    // e.g. the job list carries the status but not the HTTP code.
    expect(statusExplanationToken(JobStatus.FAILED_HTTPERROR, 0)).toBe('modes.FAILED_HTTPERROR');
    expect(statusExplanationToken(JobStatus.FAILED_HTTPERROR, undefined)).toBe('modes.FAILED_HTTPERROR');
  });
});
