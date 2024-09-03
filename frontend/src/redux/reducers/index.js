import { combineReducers }  from 'redux';
import auth from './auth';
import dashboard from './dashboard';
import jobs from './jobs';
import timezones from './timezones';
import userProfile from './userProfile';
import ui from './ui';
import folders from './folders';
import { ActionTypes } from '../actionTypes';

const appReducer = combineReducers({
  auth,
  dashboard,
  jobs,
  timezones,
  userProfile,
  ui,
  folders
});

const rootReducer = (state, action) => {
  if (action.type === ActionTypes.LOGOUT) {
    return appReducer(undefined, action);
  } else {
    return appReducer(state, action);
  }
}

export default rootReducer;
