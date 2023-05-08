import { ActionTypes } from './actionTypes';

export function setAuthToken(token) {
  return {
    type: ActionTypes.SET_AUTH_SESSION,
    session: { token }
  }
}

export function endSession() {
  //! @todo Flush complete state!
  return {
    type: ActionTypes.SET_AUTH_SESSION,
    session: null
  }
}

export function setDashboardData(data) {
  return {
    type: ActionTypes.SET_DASHBOARD_DATA,
    data
  }
}

export function setJobs(jobs, someFailed) {
  return {
    type: ActionTypes.SET_JOBS,
    jobs,
    someFailed
  }
}

export function setTimezones(timezones) {
  return {
    type: ActionTypes.SET_TIMEZONES,
    timezones
  }
}

export function setUserProfile(userProfile) {
  return {
    type: ActionTypes.SET_USER_PROFILE,
    userProfile
  }
}

export function setUiSetting(key, value) {
  return {
    type: ActionTypes.SET_UI_SETTING,
    key,
    value
  }
}

export function setFolders(folders) {
  return {
    type: ActionTypes.SET_FOLDERS,
    folders
  }
}
