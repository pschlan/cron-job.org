// Best-effort parser for cURL command lines. Returns null when the input
// does not look like a cURL invocation or no URL can be recovered.
//
// Output shape:
//   {
//     url:     string,
//     method:  string|null,                       // upper-case, may be null when not specified
//     headers: Array<{ key: string, value: string }>,
//     body:    string|null,
//     auth:    { user: string, password: string } | null
//   }

const FLAGS_TAKING_VALUE_IGNORED = new Set([
  '-o', '--output',
  '-w', '--write-out',
  '-D', '--dump-header',
  '-c', '--cookie-jar',
  '-T', '--upload-file',
  '-K', '--config',
  '-F', '--form',
  '-y', '--speed-time',
  '-Y', '--speed-limit',
  '-z', '--time-cond',
  '-x', '--proxy',
  '-m', '--max-time',
  '-C', '--continue-at',
  '-r', '--range',
  '-Z', '--parallel-max',
  '--connect-timeout',
  '--retry',
  '--retry-delay',
  '--retry-max-time',
  '--resolve',
  '--cacert',
  '--capath',
  '--cert',
  '--cert-type',
  '--key',
  '--key-type',
  '--pass',
  '--ciphers',
  '--tlsv1', '--tlsv1.0', '--tlsv1.1', '--tlsv1.2', '--tlsv1.3',
  '--interface',
  '--noproxy',
  '--proxy-user',
  '--proxy-cacert',
  '--max-redirs',
  '--max-filesize',
  '--limit-rate',
  '--socks4', '--socks4a', '--socks5', '--socks5-hostname',
  '--service-name',
  '--unix-socket',
  '--abstract-unix-socket',
  '--http-version',
  '--alt-svc',
  '--hsts',
]);

const FLAGS_NO_VALUE_IGNORED = new Set([
  '-L', '--location',
  '-k', '--insecure',
  '-v', '--verbose',
  '-s', '--silent',
  '-S', '--show-error',
  '-i', '--include',
  '-f', '--fail',
  '-N', '--no-buffer',
  '-#', '--progress-bar',
  '--compressed',
  '--http1.0', '--http1.1', '--http2', '--http2-prior-knowledge', '--http3',
  '--no-keepalive',
  '--keepalive',
  '--no-alpn',
  '--anyauth',
  '--basic',
  '--digest',
  '--ntlm',
  '--negotiate',
  '--location-trusted',
  '--proxy-insecure',
  '--no-progress-meter',
  '--ignore-content-length',
  '--ipv4', '-4',
  '--ipv6', '-6',
  '--tcp-nodelay',
  '--tcp-fastopen',
  '--remote-name', '-O',
  '--remote-header-name', '-J',
]);

// Tokenize a shell-like command, honouring single quotes (literal), double
// quotes (with the typical `\"` `\\` `\$` `` \` `` escapes plus backslash-newline
// line continuation) and outside-quote backslash escapes. Redirections such as
// `> /dev/null 2>&1` are passed through as tokens; the parser ignores them.
export function tokenize(input) {
  const tokens = [];
  let cur = '';
  let hasCur = false;
  let inSingle = false;
  let inDouble = false;
  let inAnsiC = false; // $'...'
  let i = 0;

  const pushCur = () => {
    if (hasCur) {
      tokens.push(cur);
      cur = '';
      hasCur = false;
    }
  };

  while (i < input.length) {
    const ch = input[i];

    if (inSingle) {
      if (ch === "'") {
        inSingle = false;
      } else {
        cur += ch;
        hasCur = true;
      }
      i += 1;
      continue;
    }

    if (inAnsiC) {
      if (ch === "'") {
        inAnsiC = false;
        i += 1;
        continue;
      }
      if (ch === '\\' && i + 1 < input.length) {
        const next = input[i + 1];
        const map = {
          n: '\n', r: '\r', t: '\t', b: '\b', f: '\f',
          a: '\x07', v: '\v', '\\': '\\', "'": "'", '"': '"', '?': '?',
          '0': '\0',
        };
        if (Object.prototype.hasOwnProperty.call(map, next)) {
          cur += map[next];
          hasCur = true;
          i += 2;
          continue;
        }
        cur += next;
        hasCur = true;
        i += 2;
        continue;
      }
      cur += ch;
      hasCur = true;
      i += 1;
      continue;
    }

    if (inDouble) {
      if (ch === '\\' && i + 1 < input.length) {
        const next = input[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          cur += next;
          hasCur = true;
          i += 2;
          continue;
        }
        if (next === '\n') { // line continuation
          i += 2;
          continue;
        }
        cur += ch;
        hasCur = true;
        i += 1;
        continue;
      }
      if (ch === '"') {
        inDouble = false;
        i += 1;
        continue;
      }
      cur += ch;
      hasCur = true;
      i += 1;
      continue;
    }

    // Outside any quote.
    if (ch === '\\') {
      if (i + 1 < input.length && input[i + 1] === '\n') {
        i += 2; // line continuation
        continue;
      }
      if (i + 1 < input.length) {
        cur += input[i + 1];
        hasCur = true;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (ch === '$' && input[i + 1] === "'") {
      inAnsiC = true;
      hasCur = true; // an empty $'' should still produce an empty token
      i += 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      hasCur = true; // an empty '' should still produce an empty token
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      hasCur = true; // an empty "" should still produce an empty token
      i += 1;
      continue;
    }

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pushCur();
      i += 1;
      continue;
    }

    cur += ch;
    hasCur = true;
    i += 1;
  }

  pushCur();
  return tokens;
}

function stripCommonPrefixes(input) {
  let s = input.trim();
  // Shell prompt markers.
  s = s.replace(/^[$#]\s+/, '');
  return s;
}

function isFormUrlEncoded(headers) {
  return headers.some(h =>
    h.key.toLowerCase() === 'content-type'
    && h.value.toLowerCase().includes('application/x-www-form-urlencoded')
  );
}

function appendBody(current, addition) {
  if (current === null || current === '') return addition;
  return current + '&' + addition;
}

export function parseCurl(input) {
  if (typeof input !== 'string') return null;

  const trimmed = stripCommonPrefixes(input);
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  // Find a 'curl' token to anchor parsing. Accept leading env assignments
  // (e.g. `FOO=bar curl ...`) and a `sudo` prefix.
  let start = 0;
  while (start < tokens.length) {
    const tok = tokens[start];
    if (tok === 'curl' || tok.endsWith('/curl')) { start += 1; break; }
    if (tok === 'sudo') { start += 1; continue; }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) { start += 1; continue; }
    return null;
  }
  if (start > tokens.length) return null;

  const result = {
    url: null,
    method: null,
    headers: [],
    body: null,
    auth: null,
  };
  let explicitMethod = false;
  let formBody = false;

  for (let i = start; i < tokens.length; i += 1) {
    const tok = tokens[i];

    // --flag=value form is only legal for long flags.
    let flag = tok;
    let inlineValue = null;
    if (tok.startsWith('--') && tok.includes('=')) {
      const eq = tok.indexOf('=');
      flag = tok.substring(0, eq);
      inlineValue = tok.substring(eq + 1);
    }

    const nextArg = () => {
      if (inlineValue !== null) {
        const v = inlineValue;
        inlineValue = null;
        return v;
      }
      i += 1;
      return i < tokens.length ? tokens[i] : undefined;
    };

    switch (flag) {
      case '-X':
      case '--request': {
        const v = nextArg();
        if (v) {
          result.method = v.toUpperCase();
          explicitMethod = true;
        }
        break;
      }
      case '-H':
      case '--header': {
        const v = nextArg();
        if (v) {
          const colon = v.indexOf(':');
          if (colon > 0) {
            const key = v.substring(0, colon).trim();
            const value = v.substring(colon + 1).trim();
            if (key) result.headers.push({ key, value });
          }
        }
        break;
      }
      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-ascii':
      case '--data-binary': {
        const v = nextArg();
        if (v !== undefined) {
          result.body = appendBody(result.body, v);
          if (!explicitMethod) result.method = 'POST';
          formBody = true;
        }
        break;
      }
      case '--data-urlencode': {
        const v = nextArg();
        if (v !== undefined) {
          let encoded;
          const eqIdx = v.indexOf('=');
          if (eqIdx !== -1) {
            const name = v.substring(0, eqIdx);
            const val = v.substring(eqIdx + 1);
            encoded = name
              ? `${encodeURIComponent(name)}=${encodeURIComponent(val)}`
              : encodeURIComponent(val);
          } else {
            encoded = encodeURIComponent(v);
          }
          result.body = appendBody(result.body, encoded);
          if (!explicitMethod) result.method = 'POST';
          formBody = true;
        }
        break;
      }
      case '--json': {
        const v = nextArg();
        if (v !== undefined) {
          result.body = v;
          if (!explicitMethod) result.method = 'POST';
          if (!result.headers.find(h => h.key.toLowerCase() === 'content-type')) {
            result.headers.push({ key: 'Content-Type', value: 'application/json' });
          }
          if (!result.headers.find(h => h.key.toLowerCase() === 'accept')) {
            result.headers.push({ key: 'Accept', value: 'application/json' });
          }
        }
        break;
      }
      case '-A':
      case '--user-agent': {
        const v = nextArg();
        if (v) result.headers.push({ key: 'User-Agent', value: v });
        break;
      }
      case '-e':
      case '--referer': {
        const v = nextArg();
        if (v) result.headers.push({ key: 'Referer', value: v });
        break;
      }
      case '-b':
      case '--cookie': {
        const v = nextArg();
        // Only treat as a cookie string when it looks like one (contains '=').
        // A path like 'cookies.txt' is meant to read cookies from disk; skip it.
        if (v && v.includes('=')) {
          result.headers.push({ key: 'Cookie', value: v });
        }
        break;
      }
      case '-u':
      case '--user': {
        const v = nextArg();
        if (v) {
          const colon = v.indexOf(':');
          if (colon !== -1) {
            result.auth = {
              user: v.substring(0, colon),
              password: v.substring(colon + 1),
            };
          } else {
            result.auth = { user: v, password: '' };
          }
        }
        break;
      }
      case '-G':
      case '--get': {
        if (!explicitMethod) result.method = 'GET';
        break;
      }
      case '-I':
      case '--head': {
        if (!explicitMethod) {
          result.method = 'HEAD';
          explicitMethod = true;
        }
        break;
      }
      default: {
        if (FLAGS_NO_VALUE_IGNORED.has(flag)) break;
        if (FLAGS_TAKING_VALUE_IGNORED.has(flag)) {
          nextArg();
          break;
        }
        // Unknown long flag with --foo=bar form: drop the inline value.
        if (flag.startsWith('--')) {
          inlineValue = null;
          break;
        }
        // Combined short flags like -sSL: ignore quietly (none of the
        // combinable curl shorts that we care about take values).
        if (flag.startsWith('-') && flag.length > 1) break;
        // Positional argument: first non-flag token is the URL.
        if (!result.url) {
          result.url = tok;
        }
      }
    }
  }

  if (!result.url) return null;

  // Strip wrapping quotes (in case the URL was double-quoted inside a single-quoted block, etc.)
  result.url = result.url.replace(/^['"]+/, '').replace(/['"]+$/, '');

  // If --data was used and no Content-Type was sent, curl defaults to
  // application/x-www-form-urlencoded. Mirror that so the job actually
  // reproduces the original request.
  if (formBody && !isFormUrlEncoded(result.headers)
      && !result.headers.find(h => h.key.toLowerCase() === 'content-type')) {
    result.headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded' });
  }

  return result;
}
