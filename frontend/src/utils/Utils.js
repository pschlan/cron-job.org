import { endSession } from '../redux/actions';
import { logout } from './API';

export function logOut(dispatch) {
  logout()
    .catch(() => null)
    .finally(() => dispatch(endSession()));
}

export function intersperse(items, separator) {
  return items.reduce((previous, current, index) =>
      previous.concat((index === items.length - 1 ? [current] : [current, separator])),
    []);
}
