import { looksLikeHttpCommand, parseWget, parseHttpCommand } from './CommandParser';
import { RequestMethod } from './Constants';

describe('looksLikeHttpCommand', () => {
  it('detects a curl command', () => {
    expect(looksLikeHttpCommand('curl https://example.com')).toBe(true);
  });

  it('detects a wget command', () => {
    expect(looksLikeHttpCommand('wget https://example.com')).toBe(true);
  });

  it('detects commands behind a prompt, sudo, env vars or a path', () => {
    expect(looksLikeHttpCommand('$ curl https://example.com')).toBe(true);
    expect(looksLikeHttpCommand('sudo wget https://example.com')).toBe(true);
    expect(looksLikeHttpCommand('FOO=bar curl https://example.com')).toBe(true);
    expect(looksLikeHttpCommand('/usr/bin/curl https://example.com')).toBe(true);
  });

  it('does not flag a normal URL that merely contains the word curl/wget', () => {
    expect(looksLikeHttpCommand('https://curl.example.com')).toBe(false);
    expect(looksLikeHttpCommand('https://example.com/wget')).toBe(false);
    expect(looksLikeHttpCommand('curlywhirly://x')).toBe(false);
  });

  it('does not flag empty or non-string input', () => {
    expect(looksLikeHttpCommand('')).toBe(false);
    expect(looksLikeHttpCommand('   ')).toBe(false);
    expect(looksLikeHttpCommand(null)).toBe(false);
    expect(looksLikeHttpCommand(undefined)).toBe(false);
    expect(looksLikeHttpCommand(42)).toBe(false);
  });
});

describe('parseWget', () => {
  it('returns null for non-wget input', () => {
    expect(parseWget('curl https://example.com')).toBeNull();
    expect(parseWget('echo hi')).toBeNull();
    expect(parseWget('')).toBeNull();
    expect(parseWget(null)).toBeNull();
  });

  it('returns null when no URL is present', () => {
    expect(parseWget('wget -q -O /dev/null')).toBeNull();
  });

  it('parses a bare URL', () => {
    const r = parseWget('wget https://example.com/api');
    expect(r.url).toBe('https://example.com/api');
    expect(r.method).toBeNull();
    expect(r.headers).toEqual([]);
    expect(r.body).toBeNull();
    expect(r.auth).toBeNull();
  });

  it('consumes -O /dev/null (the classic monitoring form) without taking it as the URL', () => {
    const r = parseWget('wget -q -O /dev/null https://example.com');
    expect(r.url).toBe('https://example.com');
  });

  it('treats a glued -O- as carrying its own value', () => {
    const r = parseWget('wget -O- https://example.com');
    expect(r.url).toBe('https://example.com');
  });

  it('parses --header in both = and space forms', () => {
    const r = parseWget(
      "wget --header='Accept: application/json' --header 'X-Token: abc' https://example.com"
    );
    expect(r.headers).toEqual([
      { key: 'Accept', value: 'application/json' },
      { key: 'X-Token', value: 'abc' },
    ]);
  });

  it('parses --post-data and infers POST + form content type', () => {
    const r = parseWget("wget --post-data='name=ada' https://example.com");
    expect(r.method).toBe('POST');
    expect(r.body).toBe('name=ada');
    expect(r.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/x-www-form-urlencoded',
    });
  });

  it('respects an explicit --method over the --post-data default', () => {
    const r = parseWget("wget --method=PUT --body-data='x=1' https://example.com");
    expect(r.method).toBe('PUT');
    expect(r.body).toBe('x=1');
  });

  it('uppercases the --method value', () => {
    expect(parseWget('wget --method=delete https://example.com').method).toBe('DELETE');
  });

  it('maps --user/--password into auth', () => {
    const r = parseWget('wget --user=alice --password=secret https://example.com');
    expect(r.auth).toEqual({ user: 'alice', password: 'secret' });
  });

  it('maps --http-user/--http-password into auth', () => {
    const r = parseWget('wget --http-user=bob --http-password=pw https://example.com');
    expect(r.auth).toEqual({ user: 'bob', password: 'pw' });
  });

  it('maps -U/--user-agent to a User-Agent header', () => {
    expect(parseWget("wget -U 'my-bot/1.0' https://example.com").headers)
      .toContainEqual({ key: 'User-Agent', value: 'my-bot/1.0' });
    expect(parseWget("wget --user-agent='ua/2' https://example.com").headers)
      .toContainEqual({ key: 'User-Agent', value: 'ua/2' });
  });

  it('maps --referer to a Referer header', () => {
    expect(parseWget("wget --referer='https://ref.example' https://example.com").headers)
      .toContainEqual({ key: 'Referer', value: 'https://ref.example' });
  });

  it('does not add a form content type when the user already set one', () => {
    const r = parseWget(
      "wget --header='Content-Type: application/json' --post-data='{}' https://example.com"
    );
    const cts = r.headers.filter(h => h.key.toLowerCase() === 'content-type');
    expect(cts).toHaveLength(1);
    expect(cts[0].value).toBe('application/json');
  });

  it('ignores assorted no-value and value flags around the URL', () => {
    const r = parseWget(
      'wget -nv --no-check-certificate --tries=3 --timeout 30 -P /tmp https://example.com'
    );
    expect(r.url).toBe('https://example.com');
  });

  it('tolerates sudo and env prefixes', () => {
    expect(parseWget('sudo wget https://example.com').url).toBe('https://example.com');
    expect(parseWget('FOO=bar wget https://example.com').url).toBe('https://example.com');
  });
});

describe('parseHttpCommand', () => {
  it('returns null for input that is not a command', () => {
    expect(parseHttpCommand('https://example.com')).toBeNull();
    expect(parseHttpCommand('just some text')).toBeNull();
    expect(parseHttpCommand('')).toBeNull();
    expect(parseHttpCommand(null)).toBeNull();
  });

  it('dispatches curl commands to the curl parser', () => {
    const r = parseHttpCommand("curl -X POST -d 'a=1' https://example.com");
    expect(r.url).toBe('https://example.com');
    expect(r.method).toBe('POST');
    expect(r.body).toBe('a=1');
  });

  it('dispatches wget commands to the wget parser', () => {
    const r = parseHttpCommand("wget --post-data='a=1' https://example.com");
    expect(r.url).toBe('https://example.com');
    expect(r.method).toBe('POST');
    expect(r.body).toBe('a=1');
  });

  it('handles a prompt prefix for both tools', () => {
    expect(parseHttpCommand('$ curl https://example.com').url).toBe('https://example.com');
    expect(parseHttpCommand('$ wget https://example.com').url).toBe('https://example.com');
  });

  it('returns methods as strings that map onto RequestMethod', () => {
    const r = parseHttpCommand('wget --method=PATCH https://example.com');
    expect(Object.prototype.hasOwnProperty.call(RequestMethod, r.method)).toBe(true);
    expect(RequestMethod[r.method]).toBe(RequestMethod.PATCH);
  });
});
