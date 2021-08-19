import { combineReducers }  from 'redux';
import auth from './auth';
import dashboard from './dashboard';
import jobs from './jobs';
import timezones from './timezones';
import userProfile from './userProfile';
import ui from './ui';

export default combineReducers({
  auth,
  dashboard,
  jobs,
  timezones,
  userProfile,
  ui
});

//! @tood Logout: Flush state
