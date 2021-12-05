import { RequestMethod } from "./Constants";
import { scheduleToCrontabExpression } from "./CrontabExpression";

function sanitize(str) {
  return str.replace("\n", '').replace("\r", '');
}

function sanitizeHeaderKey(str) {
  const forbidddenChars = [
		'(', ')', '<', '>', '@',
		',', ';', ':', '\\', '"',
		'/', '[', ']', '?', '=',
		'{', '}', ' '
  ];

  let result = '';
  for (let i = 0; i < str.length; ++i) {
    const cCode = str.charCodeAt(i), c = str[i];
    if ((cCode >= 0 && cCode <= 31) || cCode === 127 || forbidddenChars.includes(c)) {
      continue;
    }
    result += c;
  }

  return result;
}

function sanitizeArg(str) {
  let result = '';
  for (let i = 0; i < str.length; ++i) {
    const c = str[i];
    if (c === '\n') {
      result += '\\n';
    } else if (c === '\\') {
      result += '\\\\\\';
    } else if (c === '"' || c === '`' || c === '$' || c === '\\') {
      result += '\\' + c;
    } else {
      result += c;
    }
  }
  return result;
}

export function exportToCrontab(job) {
  let result = '# ' + sanitize(job.title) + "\n";
  result += scheduleToCrontabExpression(job.schedule) + ' ';
  result += 'curl ';

  if (job.requestMethod > 0) {
    const method = Object.keys(RequestMethod).find(key => RequestMethod[key] === job.requestMethod);
    result += '-X ' + method + ' ';
  }

  for (const [key, value] of Object.entries(job.extendedData.headers)) {
    result += '-H "' + sanitizeHeaderKey(key) + ': ' + sanitizeArg(value) + '" ';
  }

  if (job.extendedData.body && job.extendedData.body.length > 0) {
    result += '-d "' + sanitizeArg(job.extendedData.body) + '" ';
  }

  if (job.requestTimeout) {
    result += '-m ' + job.requestTimeout + ' ';
  }

  if (job.auth.enable) {
    result += '-u "' + sanitizeArg(job.auth.user) + ':' + sanitizeArg(job.auth.password) + '" ';
  }

  result += sanitize(job.url);
  result += ' > /dev/null';

  return result;
}
