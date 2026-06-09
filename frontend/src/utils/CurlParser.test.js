import { parseCurl, tokenize } from './CurlParser';

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('curl https://example.com')).toEqual(['curl', 'https://example.com']);
  });

  it('treats consecutive whitespace as one separator', () => {
    expect(tokenize('curl   \t  https://example.com')).toEqual(['curl', 'https://example.com']);
  });

  it('keeps single-quoted tokens literally', () => {
    expect(tokenize("curl -H 'X-Foo: bar baz'"))
      .toEqual(['curl', '-H', 'X-Foo: bar baz']);
  });

  it('does not interpret escapes inside single quotes', () => {
    expect(tokenize("curl 'a\\nb'")).toEqual(['curl', 'a\\nb']);
  });

  it('honours double-quote escape sequences', () => {
    expect(tokenize('curl -H "X-Foo: \\"q\\""'))
      .toEqual(['curl', '-H', 'X-Foo: "q"']);
  });

  it('preserves an unknown backslash escape inside double quotes', () => {
    expect(tokenize('curl "a\\xb"')).toEqual(['curl', 'a\\xb']);
  });

  it('handles a backslash line continuation outside quotes', () => {
    expect(tokenize('curl \\\n  https://example.com'))
      .toEqual(['curl', 'https://example.com']);
  });

  it('handles a backslash line continuation inside double quotes', () => {
    expect(tokenize('curl "a\\\nb"')).toEqual(['curl', 'ab']);
  });

  it('decodes ANSI-C $\'..\' strings', () => {
    expect(tokenize("curl -H $'X-Foo: a\\r\\nb'"))
      .toEqual(['curl', '-H', 'X-Foo: a\r\nb']);
  });

  it('keeps empty quoted strings as tokens', () => {
    expect(tokenize("curl -d '' https://example.com"))
      .toEqual(['curl', '-d', '', 'https://example.com']);
  });

  it('strips the outer backslash for escaped whitespace outside quotes', () => {
    expect(tokenize('curl a\\ b')).toEqual(['curl', 'a b']);
  });
});

describe('parseCurl', () => {
  it('returns null for empty or non-string input', () => {
    expect(parseCurl('')).toBeNull();
    expect(parseCurl('   ')).toBeNull();
    expect(parseCurl(null)).toBeNull();
    expect(parseCurl(undefined)).toBeNull();
    expect(parseCurl(123)).toBeNull();
  });

  it('returns null when the command is not curl', () => {
    expect(parseCurl('wget https://example.com')).toBeNull();
    expect(parseCurl('echo hi')).toBeNull();
  });

  it('returns null when curl is given no URL', () => {
    expect(parseCurl('curl -v -L')).toBeNull();
  });

  it('parses a bare URL', () => {
    const r = parseCurl('curl https://example.com/api');
    expect(r.url).toBe('https://example.com/api');
    expect(r.method).toBeNull();
    expect(r.headers).toEqual([]);
    expect(r.body).toBeNull();
    expect(r.auth).toBeNull();
  });

  it('tolerates a leading shell prompt', () => {
    expect(parseCurl('$ curl https://example.com').url).toBe('https://example.com');
    expect(parseCurl('# curl https://example.com').url).toBe('https://example.com');
  });

  it('tolerates a sudo prefix', () => {
    expect(parseCurl('sudo curl https://example.com').url).toBe('https://example.com');
  });

  it('tolerates leading env assignments', () => {
    expect(parseCurl('FOO=bar BAZ=qux curl https://example.com').url)
      .toBe('https://example.com');
  });

  it('tolerates an absolute curl path', () => {
    expect(parseCurl('/usr/bin/curl https://example.com').url).toBe('https://example.com');
  });

  it('reads an explicit -X method', () => {
    const r = parseCurl('curl -X DELETE https://example.com/x');
    expect(r.method).toBe('DELETE');
    expect(r.url).toBe('https://example.com/x');
  });

  it('reads --request and uppercases the method', () => {
    expect(parseCurl('curl --request put https://example.com').method).toBe('PUT');
  });

  it('reads --request=METHOD form', () => {
    expect(parseCurl('curl --request=PATCH https://example.com').method).toBe('PATCH');
  });

  it('finds the URL no matter where it appears', () => {
    const r = parseCurl('curl -X POST -H "X-A: 1" -d body https://example.com/p');
    expect(r.url).toBe('https://example.com/p');
  });

  it('collects -H headers', () => {
    const r = parseCurl(
      "curl -H 'Authorization: Bearer abc' -H 'Accept: application/json' https://example.com"
    );
    expect(r.headers).toEqual([
      { key: 'Authorization', value: 'Bearer abc' },
      { key: 'Accept', value: 'application/json' },
    ]);
  });

  it('collects --header values and supports --header=KEY:VAL', () => {
    const r = parseCurl(
      'curl --header "X-A: 1" --header=X-B:2 https://example.com'
    );
    expect(r.headers).toEqual([
      { key: 'X-A', value: '1' },
      { key: 'X-B', value: '2' },
    ]);
  });

  it('ignores malformed header values without a colon', () => {
    const r = parseCurl("curl -H 'no-colon-here' https://example.com");
    expect(r.headers).toEqual([]);
  });

  it('parses -d body and implies POST', () => {
    const r = parseCurl("curl -d 'name=ada' https://example.com");
    expect(r.method).toBe('POST');
    expect(r.body).toBe('name=ada');
    expect(r.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/x-www-form-urlencoded',
    });
  });

  it('does not override an explicit method when -d is present', () => {
    const r = parseCurl("curl -X PUT -d 'name=ada' https://example.com");
    expect(r.method).toBe('PUT');
    expect(r.body).toBe('name=ada');
  });

  it('concatenates multiple --data parts with &', () => {
    const r = parseCurl("curl -d 'a=1' -d 'b=2' https://example.com");
    expect(r.body).toBe('a=1&b=2');
  });

  it('handles --data-urlencode with name=value', () => {
    const r = parseCurl(
      "curl --data-urlencode 'q=hello world' --data-urlencode 'p=a&b' https://example.com"
    );
    expect(r.body).toBe('q=hello%20world&p=a%26b');
  });

  it('handles --data-urlencode with bare value', () => {
    const r = parseCurl("curl --data-urlencode 'hello world' https://example.com");
    expect(r.body).toBe('hello%20world');
  });

  it('treats --data-raw and --data-binary like --data', () => {
    expect(parseCurl("curl --data-raw '{\"a\":1}' https://example.com").body).toBe('{"a":1}');
    expect(parseCurl("curl --data-binary @file https://example.com").body).toBe('@file');
  });

  it('handles --json by adding both Content-Type and Accept', () => {
    const r = parseCurl("curl --json '{\"a\":1}' https://example.com");
    expect(r.method).toBe('POST');
    expect(r.body).toBe('{"a":1}');
    expect(r.headers).toContainEqual({ key: 'Content-Type', value: 'application/json' });
    expect(r.headers).toContainEqual({ key: 'Accept', value: 'application/json' });
  });

  it('does not duplicate the JSON Content-Type when the user provided one', () => {
    const r = parseCurl(
      "curl -H 'content-type: application/vnd.api+json' --json '{\"a\":1}' https://example.com"
    );
    const cts = r.headers.filter(h => h.key.toLowerCase() === 'content-type');
    expect(cts).toHaveLength(1);
    expect(cts[0].value).toBe('application/vnd.api+json');
  });

  it('does not add a Content-Type when one is already present with -d', () => {
    const r = parseCurl(
      "curl -H 'Content-Type: text/plain' -d 'hello' https://example.com"
    );
    const cts = r.headers.filter(h => h.key.toLowerCase() === 'content-type');
    expect(cts).toHaveLength(1);
    expect(cts[0].value).toBe('text/plain');
  });

  it('parses -u user:password into auth', () => {
    const r = parseCurl('curl -u alice:secret https://example.com');
    expect(r.auth).toEqual({ user: 'alice', password: 'secret' });
  });

  it('parses --user with no password', () => {
    const r = parseCurl('curl --user alice https://example.com');
    expect(r.auth).toEqual({ user: 'alice', password: '' });
  });

  it('translates -A into a User-Agent header', () => {
    const r = parseCurl("curl -A 'my-bot/1.0' https://example.com");
    expect(r.headers).toContainEqual({ key: 'User-Agent', value: 'my-bot/1.0' });
  });

  it('translates -e into a Referer header', () => {
    const r = parseCurl("curl -e 'https://ref.example' https://example.com");
    expect(r.headers).toContainEqual({ key: 'Referer', value: 'https://ref.example' });
  });

  it('translates -b k=v into a Cookie header', () => {
    const r = parseCurl("curl -b 'sid=abc; theme=dark' https://example.com");
    expect(r.headers).toContainEqual({ key: 'Cookie', value: 'sid=abc; theme=dark' });
  });

  it('does not treat a -b filename as a Cookie header', () => {
    const r = parseCurl('curl -b cookies.txt https://example.com');
    expect(r.headers.find(h => h.key === 'Cookie')).toBeUndefined();
  });

  it('uses HEAD when -I is given without an explicit method', () => {
    const r = parseCurl('curl -I https://example.com');
    expect(r.method).toBe('HEAD');
  });

  it('ignores common informational flags and consumes their values when needed', () => {
    const r = parseCurl(
      'curl -sSL --max-time 30 --retry 3 -o /dev/null -k https://example.com'
    );
    expect(r.url).toBe('https://example.com');
  });

  it('survives a redirection that follows the URL', () => {
    const r = parseCurl('curl https://example.com > /dev/null 2>&1');
    expect(r.url).toBe('https://example.com');
  });

  it('handles backslash line continuations', () => {
    const r = parseCurl(`curl 'https://example.com/api' \\
  -H 'Accept: application/json' \\
  -H 'Authorization: Bearer abc' \\
  --data-raw '{"q":"x"}' \\
  --compressed`);
    expect(r.url).toBe('https://example.com/api');
    expect(r.method).toBe('POST');
    expect(r.body).toBe('{"q":"x"}');
    expect(r.headers).toContainEqual({ key: 'Accept', value: 'application/json' });
    expect(r.headers).toContainEqual({ key: 'Authorization', value: 'Bearer abc' });
  });

  it('decodes a Chrome-style "Copy as cURL" command with $\'\' headers', () => {
    const cmd = "curl 'https://example.com/api' "
      + "-H $'X-Multi: a\\r\\nb' "
      + "-H 'Accept: */*'";
    const r = parseCurl(cmd);
    expect(r.url).toBe('https://example.com/api');
    expect(r.headers).toContainEqual({ key: 'X-Multi', value: 'a\r\nb' });
    expect(r.headers).toContainEqual({ key: 'Accept', value: '*/*' });
  });

  it('uses the first positional argument as the URL when multiple are present', () => {
    const r = parseCurl('curl https://first.example https://second.example');
    expect(r.url).toBe('https://first.example');
  });

  it('strips wrapping quotes that survived tokenization', () => {
    expect(parseCurl(`curl '"https://example.com"'`).url).toBe('https://example.com');
  });
});
