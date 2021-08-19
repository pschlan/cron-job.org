import { createStore } from 'redux';
import rootReducer from './reducers';

function loadState() {
  try {
    const serializedState = localStorage.getItem('state');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
}

function saveState(state) {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('state', serializedState);
  } catch { }
}

const persistedState = loadState();
export const store = createStore(rootReducer, persistedState);

store.subscribe(() => {
  saveState({
    auth: store.getState().auth,
    ui: store.getState().ui
  });
});
