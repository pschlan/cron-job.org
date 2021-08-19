import { ActionTypes } from "../actionTypes";

const lastEvents = (state = {}, action) => {
  switch (action.type) {
  case ActionTypes.SET_DASHBOARD_DATA:
    return {
      ...action.data
    };
  default:
    return state;
  }
}

export default lastEvents;
