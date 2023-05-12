import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getFolders } from '../utils/API';
import { setFolders } from '../redux/actions';

export default function useFolders() {
  const folders = useSelector(state => state.folders);
  const dispatch = useDispatch();

  useEffect(() => {
    if (typeof(folders.folders) === 'undefined') {
      getFolders().then(response => dispatch(setFolders(response.folders)));
    }
  }, [folders, dispatch]);

  return folders.folders || [];
}
