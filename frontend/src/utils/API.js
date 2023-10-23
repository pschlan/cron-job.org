import axios from 'axios'
import { Config } from './Config';
import { store } from '../redux';
import { setAuthToken } from '../redux/actions';
import i18n from 'i18next';
import { snackbarRef } from '../App';
import { getLanguageCode } from '../hooks/useLanguageCode';
import { logOut } from './Utils';

function performRequest(method, payload, authenticated = true, isLogoutRequest = false) {
  const auth = store && store.getState().auth;
  const authHeaders = authenticated && auth && auth.session ? {
    'Authorization': 'Bearer ' + auth.session.token
  } : {};

  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Method': method,
      'X-UI-Language': getLanguageCode(i18n.languages),
      ...authHeaders
    };
    const data = JSON.stringify(payload);

    axios.post(Config.apiURL, data, { headers, withCredentials: true })
      .then((response) => {
        if ('x-refreshed-token' in response.headers) {
          store.dispatch(setAuthToken(response.headers['x-refreshed-token']));
        }
        resolve(response.data);
      })
      .catch((error ) => {
        if (error.response && error.response.status === 401 && authenticated && !isLogoutRequest) {
          store && logOut(store.dispatch);
          return;
        }
        if (error.response && error.response.status === 429) {
          if (snackbarRef) {
            snackbarRef.enqueueSnackbar(i18n.t('common.rateLimitExceeded'), { variant: 'error' });
          }
        }
        reject(error);
      });
  });
}

export function login(email, password, rememberMe = false, mfaCode = '') {
  const additional = {};
  if (mfaCode !== '') {
    additional.mfaCode = mfaCode;
  }
  return performRequest('Login', {
    email,
    password,
    rememberMe,
    ...additional
  }, false);
}

export function resendActivationEmail(email, password) {
  return performRequest('ResendActivationEmail', { email, password }, false);
}

export function logout() {
  return performRequest('Logout', null, true, true);
}

export function refreshSession() {
  return performRequest('RefreshSession');
}

export function getDashboard() {
  return performRequest('GetDashboard');
}

export function getJobs() {
  return performRequest('GetJobs');
}

export function getJobHistory(jobId) {
  return performRequest('GetJobHistory', {
    jobId
  });
}

export function getJobHistoryDetails(identifier) {
  return performRequest('GetJobHistoryDetails', {
    identifier
  });
}

export function getJobDetails(jobId) {
  return performRequest('GetJobDetails', {
    jobId
  });
}

export function getStatusPages() {
  return performRequest('GetStatusPages');
}

export function getStatusPage(statusPageId) {
  return performRequest('GetStatusPage', {
    statusPageId
  });
}

export function getFolders() {
  return performRequest('GetFolders');
}

export function createFolder(title) {
  return performRequest('CreateFolder', {
    title
  });
}

export function updateFolder(folderId, title) {
  return performRequest('UpdateFolder', {
    folderId,
    title
  });
}

export function deleteFolder(folderId) {
  return performRequest('DeleteFolder', {
    folderId
  });
}

export function updateStatusPage(statusPageId, statusPage) {
  return performRequest('UpdateStatusPage', {
    statusPageId,
    statusPage
  });
}

export function createStatusPageMonitor(statusPageId, jobId, title) {
  return performRequest('CreateStatusPageMonitor', {
    statusPageId,
    jobId,
    title
  });
}

export function updateStatusPageMonitor(monitorId, monitor) {
  return performRequest('UpdateStatusPageMonitor', {
    monitorId,
    monitor
  });
}

export function updateStatusPageMonitorsOrder(statusPageId, order) {
  return performRequest('UpdateStatusPageMonitorsOrder', {
    statusPageId,
    order
  });
}

export function deleteStatusPage(statusPageId) {
  return performRequest('DeleteStatusPage', {
    statusPageId
  });
}

export function deleteStatusPageMonitor(monitorId) {
  return performRequest('DeleteStatusPageMonitor', {
    monitorId
  });
}

export function createStatusPageDomain(statusPageId, domain) {
  return performRequest('CreateStatusPageDomain', {
    statusPageId,
    domain
  });
}

export function deleteStatusPageDomain(statusPageId, domain) {
  return performRequest('DeleteStatusPageDomain', {
    statusPageId,
    domain
  });
}

export function createStatusPage(title) {
  return performRequest('CreateStatusPage', {
    title
  });
}

export function getTimezones() {
  return performRequest('GetTimezones', {}, false);
}

export function updateJob(jobId, job) {
  return performRequest('UpdateJob', {
    jobId,
    job
  });
}

export function executeJobMassAction(jobIds, action, args = {}) {
  return performRequest('ExecuteJobMassAction', {
    jobIds,
    action,
    ...args
  });
}

export function deleteJob(jobId) {
  return performRequest('DeleteJob', {
    jobId
  });
}

export function cloneJob(jobId, suffix) {
  return performRequest('CloneJob', {
    jobId,
    suffix
  });
}

export function createJob(job) {
  return performRequest('CreateJob', {
    job
  });
}

export function getUserProfile() {
  return performRequest('GetUserProfile');
}

export function updateUserLanguage(language) {
  if (!store || !store.getState().auth || !store.getState().auth.session) {
    return;
  }
  return performRequest('UpdateUserLanguage', {
    language
  });
}

export function updateUserProfile(userProfile) {
  return performRequest('UpdateUserProfile', {
    userProfile
  });
}

export function getServiceStatistics() {
  return performRequest('GetServiceStatistics');
}

export function changeUserPassword(oldPassword, newPassword) {
  return performRequest('ChangeUserPassword', {
    oldPassword,
    newPassword
  });
}

export function changeUserEmail(newEmail) {
  return performRequest('ChangeUserEmail', {
    newEmail
  });
}

export function confirmUserEmailChange(token) {
  return performRequest('ConfirmUserEmailChange', {
    token
  }, false);
}

export function recoverPassword(email) {
  return performRequest('RecoverPassword', {
    email
  }, false);
}

export function resetPassword(token, newPassword) {
  return performRequest('ResetPassword', {
    token,
    newPassword
  }, false);
}

export function createAccount(token, firstName, lastName, email, password, timezone) {
  return performRequest('CreateAccount', {
    token,
    firstName,
    lastName,
    email,
    password,
    timezone
  }, false);
}

export function confirmAccount(token) {
  return performRequest('ConfirmAccount', {
    token
  }, false);
}

export function deleteAccount(emailAddress) {
  return performRequest('DeleteAccount', {
    'really': 'reallyDeleteAccount',
    emailAddress
  });
}

export function updateUserNewsletterSubscribe(subscribe) {
  return performRequest('UpdateUserNewsletterSubscribe', {
    subscribe
  });
}

export function submitJobTestRun(token, jobId, job) {
  return performRequest('SubmitJobTestRun', {
    jobId,
    job,
    token
  });
}

export function getJobTestRunStatus(handle) {
  return performRequest('GetJobTestRunStatus', {
    handle
  });
}

export function deleteJobTestRun(handle) {
  return performRequest('DeleteJobTestRun', {
    handle
  });
}

export function createBillingPortalSession() {
  return performRequest('CreateBillingPortalSession', {});
}

export function getSubscriptionLink(type) {
  return performRequest('GetSubscriptionLink', { type });
}

export function getMFADevices() {
  return performRequest('GetMFADevices', {});
}

export function createMFADevice(title, type, password, code) {
  const additional = {};
  if (code) {
    additional.code = code;
  }
  return performRequest('CreateMFADevice', { title, type, password, ...additional });
}

export function confirmMFADevice(mfaDeviceId, code) {
  return performRequest('ConfirmMFADevice', { mfaDeviceId, code });
}

export function deleteMFADevice(mfaDeviceId, password) {
  return performRequest('DeleteMFADevice', { mfaDeviceId, password });
}

export function getAPIKeys() {
  return performRequest('GetAPIKeys', {});
}

export function getAPIKeyToken(apiKeyId, password) {
  return performRequest('GetAPIKeyToken', { apiKeyId, password });
}

export function deleteAPIKey(apiKeyId) {
  return performRequest('DeleteAPIKey', { apiKeyId });
}

export function createAPIKey(title, ipAddresses) {
  const limitIPs = ipAddresses.split(',').map(x => x.trim()).filter(x => x.indexOf('.') > 0);
  return performRequest('CreateAPIKey', { title, limitIPs });
}

export function updateAPIKey(apiKeyId, title, ipAddresses) {
  const limitIPs = ipAddresses.split(',').map(x => x.trim()).filter(x => x.indexOf('.') > 0);
  return performRequest('UpdateAPIKey', { apiKeyId, title, limitIPs });
}

export function reenableUserNotifications() {
  return performRequest('ReenableUserNotifications', {});
}
