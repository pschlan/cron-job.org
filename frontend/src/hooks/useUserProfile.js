import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getUserProfile } from '../utils/API';
import { setUserProfile } from '../redux/actions';

export default function useUserProfile() {
  const userProfile = useSelector(state => state.userProfile);
  const dispatch = useDispatch();

  useEffect(() => {
    if (Object.keys(userProfile).length === 0) {
      getUserProfile().then(response => dispatch(setUserProfile(response)));
    }
  }, [userProfile, dispatch]);

  return userProfile || {};
}
