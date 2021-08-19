import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { refreshSession } from '../../utils/API';
import { Config } from '../../utils/Config';

export default function SessionKeepalive() {
  const sessionToken = useSelector(state => state.auth && state.auth.session && state.auth.session.token);

  useEffect(() => {
    const timeoutID = window.setTimeout(() => refreshSession(), Config.sessionRefreshInterval);
    return () => window.clearInterval(timeoutID);
  }, [sessionToken]);

  return <></>;
}
