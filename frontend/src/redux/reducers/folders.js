import { ActionTypes } from "../actionTypes";

const folders = (state = {}, action) => {
  switch (action.type) {
  case ActionTypes.SET_FOLDERS:
    return {
      ...state,
      folders: action.folders
    };
  default:
    return state;
  }
}

export default folders;
