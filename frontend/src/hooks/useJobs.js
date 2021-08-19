import { useEffect, useState } from 'react';
import { getJobs } from '../utils/API';
import { setJobs } from '../redux/actions';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

export default function useJobs(refreshInterval = 0, selector = (jobs) => jobs, refresh = true) {
  //! @todo Prevent refresh when refresh == false and jobs already loaded

  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const [ refreshRequest, setRefreshRequest ] = useState(null);

  useEffect(() => {
    const doRefresh = async () => {
      getJobs()
        .then(result => dispatch(setJobs(result.jobs, result.someFailed)))
        .catch(() => enqueueSnackbar(t('common.connectivityIssue'), { variant: 'error' }));
    };

    doRefresh();

    if (refreshInterval) {
      const handle = window.setInterval(doRefresh, refreshInterval);
      return () => window.clearInterval(handle);
    }
  }, [dispatch, refreshInterval, enqueueSnackbar, t, refreshRequest]);

  const jobs = useSelector(state => state && state.jobs && state.jobs.jobs);

  return {
    jobs: selector(jobs || []),
    loading: jobs === undefined,
    refresh: () => setRefreshRequest(Math.random())
  };
}

export function useJob(jobId) {
  const { jobs: job, loading } = useJobs(
    0,
    jobs => jobs.find(x => x.jobId === jobId),
    false
  );
  return { job, loading };
}
