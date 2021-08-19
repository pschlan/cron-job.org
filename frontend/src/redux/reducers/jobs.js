import { ActionTypes } from "../actionTypes";

const jobs = (state = {}, action) => {
  switch (action.type) {
  case ActionTypes.SET_JOBS:
    return {
      ...state,
      jobs: action.jobs,
      someJobsFailedToRetrieve: action.someFailed
    };
  default:
    return state;
  }
}

export default jobs;
