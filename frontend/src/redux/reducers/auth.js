import { ActionTypes } from "../actionTypes";

const auth = (state = {}, action) => {
  switch (action.type) {
  case ActionTypes.SET_AUTH_SESSION:
    return {
      ...state,
      session: action.session
    };
  default:
    return state;
  }
}

export default auth;
