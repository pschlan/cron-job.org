// Detection and parsing of HTTP command lines (cURL and wget) that users
// sometimes paste straight into the job URL field (see GitHub issue #103).
//
// The cURL half lives in CurlParser.js; this module adds a wget parser and a
// small dispatcher so the rest of the app can deal with "an HTTP command line"
// without caring which tool produced it. Both parsers share the shell tokenizer
// from CurlParser and return the same shape:
//
//   {
//     url:     string,
//     method:  string|null,                       // upper-case, may be null
//     headers: Array<{ key: string, value: string }>,
//     body:    string|null,
//     auth:    { user: string, password: string } | null
//   }

import { tokenize, parseCurl } from './CurlParser';
import { crontabExpressionToSchedule } from './CrontabExpression';

// Cheap check used by the UI to decide whether to offer an import. Matches a
// leading `curl`/`wget` command word, tolerating a `$ `/`# ` prompt, a `sudo`
// prefix, leading env assignments and an absolute path. Crucially it does NOT
// match a normal URL such as `https://curl.example.com`.
// The path-prefix segment deliberately excludes ':' so an executable path like
// '/usr/bin/curl' matches while a URL such as 'https://example.com/wget' (which
// carries a '://' scheme) does not.
const COMMAND_PREFIX = /^\s*(?:[$#]\s+)?(?:sudo\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:[\w./~-]*\/)?(curl|wget)(?:\s|$)/;

export function looksLikeHttpCommand(input) {
  if (typeof input !== 'string') return false;
  return COMMAND_PREFIX.test(input);
}

// wget flags that take a separate value we don't care about. When the flag is
// written as `--flag=value` the value is inline and dropped automatically; the
// short forms below are only consumed when the token is exactly the flag (e.g.
// `-O /dev/null`) — a glued form such as `-O-` carries its own value.
const WGET_LONG_VALUE_IGNORED = new Set([
  '--output-document',
  '--output-file',
  '--append-output',
  '--timeout',
  '--dns-timeout',
  '--connect-timeout',
  '--read-timeout',
  '--tries',
  '--wait',
  '--waitretry',
  '--directory-prefix',
  '--execute',
  '--level',
  '--limit-rate',
  '--max-redirect',
  '--quota',
  '--base',
  '--include-directories',
  '--exclude-directories',
  '--bind-address',
  '--ca-certificate',
  '--ca-directory',
  '--certificate',
  '--certificate-type',
  '--private-key',
  '--private-key-type',
  '--cut-dirs',
  '--restrict-file-names',
  '--progress',
  '--compression',
  '--report-speed',
  '--user-agent', // handled explicitly, listed here for completeness
]);

const WGET_SHORT_VALUE_IGNORED = new Set([
  '-O', '-o', '-a', '-T', '-t', '-w', '-P', '-e', '-l', '-Q', '-B', '-I', '-X',
]);

function stripCommandPrefix(tokens, command) {
  let start = 0;
  while (start < tokens.length) {
    const tok = tokens[start];
    if (tok === command || tok.endsWith('/' + command)) { start += 1; return start; }
    if (tok === 'sudo') { start += 1; continue; }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) { start += 1; continue; }
    return -1;
  }
  return -1;
}

export function parseWget(input) {
  if (typeof input !== 'string') return null;

  let trimmed = input.trim().replace(/^[$#]\s+/, '');
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  const start = stripCommandPrefix(tokens, 'wget');
  if (start === -1) return null;

  const result = {
    url: null,
    method: null,
    headers: [],
    body: null,
    auth: null,
  };
  let explicitMethod = false;
  let hasBody = false;
  let authUser = null;
  let authPassword = null;

  for (let i = start; i < tokens.length; i += 1) {
    const tok = tokens[i];

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
      case '--method': {
        const v = nextArg();
        if (v) {
          result.method = v.toUpperCase();
          explicitMethod = true;
        }
        break;
      }
      case '--post-data':
      case '--body-data': {
        const v = nextArg();
        if (v !== undefined) {
          result.body = v;
          hasBody = true;
          if (!explicitMethod && flag === '--post-data') result.method = 'POST';
        }
        break;
      }
      case '--post-file':
      case '--body-file': {
        const v = nextArg();
        if (v !== undefined) {
          result.body = v;
          hasBody = true;
          if (!explicitMethod && flag === '--post-file') result.method = 'POST';
        }
        break;
      }
      case '-U':
      case '--user-agent': {
        const v = nextArg();
        if (v) result.headers.push({ key: 'User-Agent', value: v });
        break;
      }
      case '--referer': {
        const v = nextArg();
        if (v) result.headers.push({ key: 'Referer', value: v });
        break;
      }
      case '--header-line': {
        nextArg();
        break;
      }
      case '--user':
      case '--http-user': {
        const v = nextArg();
        if (v !== undefined) authUser = v;
        break;
      }
      case '--password':
      case '--http-password': {
        const v = nextArg();
        if (v !== undefined) authPassword = v;
        break;
      }
      default: {
        if (WGET_LONG_VALUE_IGNORED.has(flag)) {
          nextArg();
          break;
        }
        if (flag.startsWith('--')) {
          // Unknown long flag: an inline value is dropped, a bare flag is a toggle.
          inlineValue = null;
          break;
        }
        if (tok.startsWith('-') && tok.length > 1) {
          // Short flag. Consume a following value only when the token is exactly
          // a known value-taking short flag (so `-O /dev/null` works, while a
          // glued `-O-` or a toggle like `-q` consumes nothing extra).
          if (WGET_SHORT_VALUE_IGNORED.has(tok)) {
            nextArg();
          }
          break;
        }
        // Positional argument: first one is the URL.
        if (!result.url) {
          result.url = tok;
        }
      }
    }
  }

  if (!result.url) return null;

  result.url = result.url.replace(/^['"]+/, '').replace(/['"]+$/, '');

  if (authUser !== null || authPassword !== null) {
    result.auth = { user: authUser || '', password: authPassword || '' };
  }

  // wget sends form-encoded bodies by default; mirror curl's behaviour so the
  // resulting job actually reproduces the request.
  if (hasBody && !result.headers.find(h => h.key.toLowerCase() === 'content-type')) {
    result.headers.push({ key: 'Content-Type', value: 'application/x-www-form-urlencoded' });
  }

  return result;
}

const CRON_FIELD_RE = /^(?:\*(?:\/\d+)?|\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*)$/;

export function looksLikeCrontabLine(input) {
  if (typeof input !== 'string') return false;
  const parts = input.trim().split(/\s+/);
  if (parts.length < 6) return false;
  for (let i = 0; i < 5; i++) {
    if (!CRON_FIELD_RE.test(parts[i])) return false;
  }
  let idx = 0;
  const trimmed = input.trim();
  for (let i = 0; i < 5; i++) {
    idx = trimmed.indexOf(parts[i], idx) + parts[i].length;
    while (idx < trimmed.length && /\s/.test(trimmed[idx])) idx++;
  }
  return looksLikeHttpCommand(trimmed.substring(idx));
}

export function parseCrontabLine(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 6) return null;

  const cronExpr = parts.slice(0, 5).join(' ');
  const schedule = crontabExpressionToSchedule(cronExpr);
  if (!schedule) return null;

  let idx = 0;
  for (let i = 0; i < 5; i++) {
    idx = trimmed.indexOf(parts[i], idx) + parts[i].length;
    while (idx < trimmed.length && /\s/.test(trimmed[idx])) idx++;
  }
  const commandStr = trimmed.substring(idx);

  const command = parseHttpCommand(commandStr);
  if (!command || !command.url) return null;

  return { schedule, command };
}

export function parseHttpCommand(input) {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim().replace(/^[$#]\s+/, '');
  const match = COMMAND_PREFIX.exec(input);
  if (!match) return null;

  if (match[1] === 'wget') {
    return parseWget(trimmed);
  }
  return parseCurl(trimmed);
}
