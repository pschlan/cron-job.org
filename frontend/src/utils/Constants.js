export const SubscriptionStatus = {
  INACTIVE: 0,
  PENDING: 1,
  ACTIVE: 2,
  EXPIRING: 3,
  CANCELLED: 4
};

export const JobStatus = {
  UNKNOWN: 0,
  OK: 1,
  FAILED_DNS: 2,
  FAILED_CONNECT: 3,
  FAILED_HTTPERROR: 4,
  FAILED_TIMEOUT: 5,
  FAILED_SIZE: 6,
  FAILED_URL: 7,
  FAILED_INTERNAL: 8,
  FAILED_OTHERS: 9
};

export const RequestMethod = {
  GET: 0,
  POST: 1,
  OPTIONS: 2,
  HEAD: 3,
  PUT: 4,
  DELETE: 5,
  TRACE: 6,
  CONNECT: 7,
  PATCH: 8
};

export const JobTestRunState = {
  PREPARING: 0,
  CONNECTING: 1,
  SENDING_HEADERS: 2,
  SENDING_DATA: 3,
  RECEIVING_HEADERS: 4,
  RECEIVING_DATA: 5,
  DONE: 6
};

export const RequestMethodsSupportingCustomBody = [
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.DELETE,
  RequestMethod.PATCH
];

export function jobStatusText(code) {
  return Object.keys(JobStatus).find(k => JobStatus[k] === code) || 'UNKNOWN';
}

export const NotificationType = {
  FAILURE: 0,
  SUCCESS: 1,
  DISABLE: 2
};

export function notificationTypeText(code) {
  return Object.keys(NotificationType).find(k => NotificationType[k] === code) || 'UNKNOWN';
}

export const ChartColors = [
  '#003f5c',
  '#444e86',
  '#955196',
  '#dd5182',
  '#ff6e54',
  '#ffa600'
];

export const TimingFields = [
  'nameLookup', 'connect', 'appConnect', 'preTransfer', 'startTransfer', 'total'
];

export const RegexPatterns = {
  password: /.{8,}/i,
  url: /^https?:\/\/[^ ]+\.[^ ]+/i,
  email: /^[^ ]+@[^ ]+\.[^ ]+$/,
  name: /.+/,
  title: /.{3,}/i,
  float: /^-?[0-9]+(\.[0-9]+)?$/,
  integer: /^-?[0-9]+$/,
  domain: /^([a-zA-Z0-9][a-zA-Z0-9-]*)(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/
};
