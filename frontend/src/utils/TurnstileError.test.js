import { turnstileFailureAction } from './TurnstileError';

describe('turnstileFailureAction', () => {
  const retryableCodes = [110600, 110620, 200500, 300010, 300030, 600010];
  const terminalCodes = [110100, 110110, 110200, 200100, 400020, 400021, 400070];

  it('lets Turnstile retry retryable codes on the first two attempts', () => {
    for (const code of retryableCodes) {
      expect(turnstileFailureAction(code, 1)).toBe('retry');
      expect(turnstileFailureAction(String(code), 1)).toBe('retry');
      expect(turnstileFailureAction(String(code), 2)).toBe('retry');
    }
  });

  it('fails retryable codes after the retry window', () => {
    for (const code of retryableCodes) {
      expect(turnstileFailureAction(String(code), 3)).toBe('fail');
    }
  });

  it('fails non-retryable codes immediately', () => {
    for (const code of terminalCodes) {
      expect(turnstileFailureAction(String(code), 1)).toBe('fail');
    }
  });

  it('fails immediately when the script did not load', () => {
    expect(turnstileFailureAction('Failed to load Turnstile.', 1)).toBe('fail');
    expect(turnstileFailureAction(undefined, 1)).toBe('fail');
    expect(turnstileFailureAction(null, 1)).toBe('fail');
  });
});
