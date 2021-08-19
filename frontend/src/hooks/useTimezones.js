import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getTimezones } from '../utils/API';
import { setTimezones } from '../redux/actions';

export default function useTimezones() {
  const timezones = useSelector(state => state.timezones);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!timezones || !timezones.length) {
      getTimezones().then(response => dispatch(setTimezones(response.timezones)));
    }
  }, [timezones, dispatch]);

  return timezones || [];
}
