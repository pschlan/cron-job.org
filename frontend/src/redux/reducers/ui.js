import { ActionTypes } from '../actionTypes';

const ui = (state = {}, action) => {
  switch (action.type) {
  case ActionTypes.SET_UI_SETTING:
    return {
      ...state,
      [action.key]: action.value
    };
  default:
    return state;
  }
}

export default ui;
