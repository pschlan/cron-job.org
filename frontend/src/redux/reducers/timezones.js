import { ActionTypes } from "../actionTypes";

const timezones = (state = [], action) => {
  switch (action.type) {
  case ActionTypes.SET_TIMEZONES:
    return [...action.timezones];
  default:
    return state;
  }
}

export default timezones;
