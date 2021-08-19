import { ActionTypes } from "../actionTypes";

const userProfile = (state = {}, action) => {
  switch (action.type) {
  case ActionTypes.SET_USER_PROFILE:
    return {...action.userProfile};
  default:
    return state;
  }
}

export default userProfile;
